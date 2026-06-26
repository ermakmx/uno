import { test, expect, Page, BrowserContext } from '@playwright/test'

const PLAYER_COUNT = 2

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

test.describe.configure({ mode: 'serial', timeout: 600_000 })

test('2 jugadores — partida visual', async ({ browser }) => {
  const contexts: BrowserContext[] = []
  const pages: Page[] = []
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const ctx = await browser.newContext({ viewport: { width: 480, height: 620 }, locale: 'es' })
    contexts.push(ctx)
    pages.push(await ctx.newPage())
  }

  try {
    const p1 = pages[0]

    // ── P1 create ──────────────────────────────────────────────
    await p1.goto('/')
    await p1.waitForSelector('input[placeholder="Tu nombre"]', { timeout: 60000 })
    await p1.fill('input[placeholder="Tu nombre"]', 'P1')
    await p1.click('button:has-text("Crear privada")')
    await p1.waitForSelector('text=Sala de juego', { timeout: 60000 })
    await delay(300)
    const code = (await p1.locator('p[class*="font-mono"]').textContent())?.trim() ?? ''
    console.log('Code:', code)

    // ── P2-10 join ─────────────────────────────────────────────
    for (let i = 1; i < PLAYER_COUNT; i++) {
      const p = pages[i]
      await p.goto('/')
      await p.waitForSelector('input[placeholder="Tu nombre"]', { timeout: 60000 })
      await p.fill('input[placeholder="Tu nombre"]', `P${i + 1}`)
      await p.fill('input[placeholder="Código de sala"]', code)
      await p.click('button:has-text("Unirse")')
      await p.waitForSelector('text=Sala de juego', { timeout: 60000 })
    }
    console.log('All joined')
    await p1.waitForFunction(`document.body.textContent.includes("(${PLAYER_COUNT})")`, { timeout: 20000 })
    await delay(500)

    // ── Start ──────────────────────────────────────────────────
    await p1.click('button:has-text("Iniciar partida")')
    for (const p of pages) {
      await p.waitForSelector('[data-testid="draw-pile"]', { timeout: 60000 }).catch(() => {})
      await p.waitForSelector('[data-testid="card"]', { timeout: 60000 }).catch(() => {})
    }
    console.log('Game started')
    await delay(1500)

    // ── Game loop ──────────────────────────────────────────────
    // Helper: try to play any enabled card (with a safety limit).
    // Returns 'played' if a card was played, 'ended' if game ended, '' if nothing happened.
    async function tryPlay(page: Page): Promise<'played' | 'ended' | ''> {
      const cards = page.locator('[data-testid="card"]:not([disabled])')
      const n = await cards.count()
      if (n === 0) return ''
      const startCount = await page.locator('[data-testid="card"]').count()
      for (let ci = 0; ci < n && ci < 20; ci++) {
        const btn = cards.nth(ci)
        await btn.dblclick()
        await delay(700)
        if (await page.locator('text=Elige un color').isVisible().catch(() => false)) {
          const colorBtns = page.locator('button[class*="rounded-full"]')
          if (await colorBtns.count() > 0) await colorBtns.first().click()
          await delay(400)
        }
        const t = (await page.textContent('body').catch(() => '')) ?? ''
        if (t.includes('¡Ganaste!') || t.includes('Fin de la partida')) return 'ended'
        // hand shrunk → card was played
        if ((await page.locator('[data-testid="card"]').count()) < startCount) return 'played'
        // turn changed → card was played (normal case)
        if (!t.includes('Tu turno')) return 'played'
      }
      return ''
    }

    let finished = false
    for (let round = 0; round < 300 && !finished; round++) {
      for (let i = 0; i < PLAYER_COUNT && !finished; i++) {
        const p = pages[i]
        await delay(400)

        const txt = (await p.textContent('body').catch(() => '')) ?? ''
        if (txt.includes('¡Ganaste!') || txt.includes('Fin de la partida')) { finished = true; break }
        if (!txt.includes('Tu turno')) continue

        console.log(`R${round} P${i + 1}`)

        // 1) Try to play from hand FIRST
        let result = await tryPlay(p)
        if (result === 'ended') { finished = true; break }
        if (result === 'played') {
          console.log('  played from hand')
          if ((await p.textContent('body').catch(() => ''))?.includes('¡Ganaste!') ||
              (await p.textContent('body').catch(() => ''))?.includes('Fin de la partida')) { finished = true; break }
          continue
        }

        // 2) Draw
        if (await p.locator('[data-testid="draw-pile"]').isVisible().catch(() => false)) {
          await p.locator('[data-testid="draw-pile"]').click()
          await delay(700)
        }

        const t2 = (await p.textContent('body').catch(() => '')) ?? ''
        if (t2.includes('¡Ganaste!') || t2.includes('Fin de la partida')) { finished = true; break }

        // 3) Try to play the drawn card
        result = await tryPlay(p)
        if (result === 'ended') { finished = true; break }
        if (result === 'played') {
          console.log('  played after draw')
          if ((await p.textContent('body').catch(() => ''))?.includes('¡Ganaste!') ||
              (await p.textContent('body').catch(() => ''))?.includes('Fin de la partida')) { finished = true; break }
          continue
        }

        // 4) Pass
        const pass = p.locator('button:has-text("Pasar")')
        if (await pass.isVisible().catch(() => false)) {
          await pass.click()
          console.log('  passed')
          await delay(200)
        }

        const t3 = (await p.textContent('body').catch(() => '')) ?? ''
        if (t3.includes('¡Ganaste!') || t3.includes('Fin de la partida')) { finished = true; break }
      }
    }

    let ok = false
    for (const p of pages) {
      const t = (await p.textContent('body').catch(() => '')) ?? ''
      if (t.includes('¡Ganaste!') || t.includes('Fin de la partida')) ok = true
    }
    expect(ok).toBe(true)
    console.log('Game ended!')
    await delay(5000)
  } finally {
    for (const ctx of contexts) await ctx.close().catch(() => {})
  }
})