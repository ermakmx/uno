import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'

const src = readFileSync('assets/UNO_cards_deck.svg', 'utf8')
const layerOpen = src.indexOf('<g transform="translate(1261,748.63787)" id="layer1">')
const layerStart = src.indexOf('>', layerOpen) + 1
const layerInner = src.slice(layerStart, src.lastIndexOf('</g></svg>'))

function parseGroups(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    const o = s.indexOf('<g', i)
    if (o === -1) break
    if (!(s[o + 2] === ' ' || s[o + 2] === '>')) { i = o + 2; continue }
    const te = s.indexOf('>', o)
    const attrs = s.slice(o + 2, te)
    let d = 1, j = te + 1
    while (d > 0 && j < s.length) {
      const no = s.indexOf('<g', j)
      const nc = s.indexOf('</g>', j)
      if (nc === -1) break
      if (no !== -1 && no < nc && (s[no + 2] === ' ' || s[no + 2] === '>')) { d++; j = s.indexOf('>', no) + 1 }
      else { d--; j = nc + 4 }
    }
    out.push({ attrs, content: s.slice(te + 1, j - 4) })
    i = j
  }
  return out
}
function tfAttr(attrs) {
  const m = /transform="([^"]*)"/.exec(attrs)
  return m ? m[1] : ''
}
function rectPos(content) {
  const m = /<rect[^>]*width="60"[^>]*height="90"[^>]*\bx="([^"]+)"[^>]*\by="([^"]+)"/.exec(content)
  if (!m) return null
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) }
}
function innerColor(content) {
  const m = /<rect[^>]*width="50"[^>]*height="80"[^>]*style="([^"]*)"/.exec(content)
  if (!m) return null
  const h = /fill:(#[0-9a-fA-F]+)/.exec(m[1])
  return h ? h[1].toLowerCase() : null
}

const COLOR_HEX = { '#ff5555': 'red', '#ffaa00': 'yellow', '#55aa55': 'green', '#5555ff': 'blue', '#5555fd': 'blue' }
const COL_TYPE = { 0: '0', 60: '1', 120: '2', 180: '3', 240: '4', 300: '5', 360: '6', 420: '7', 480: '8', 540: '9', 600: 'skip', 660: 'reverse' }

const OUT = 'packages/client/public/cards'
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

function emit(name, sx, sy, groupTransform, groupContent) {
  const svg =
`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="${sx} ${sy} 240 360">
  <g transform="translate(1261,748.63787)">
    <g transform="${groupTransform}">
${groupContent.split('\n').map(l => '      ' + l).join('\n')}
    </g>
  </g>
</svg>
`
  writeFileSync(`${OUT}/${name}.svg`, svg)
}

const seen = new Set()
for (const g of parseGroups(layerInner)) {
  // only direct children of layer1 (one level, scale-4 rows)
  const tf = tfAttr(g.attrs)
  if (!/^matrix\(4,0,0,4,/.test(tf)) continue
  const pos = rectPos(g.content)
  if (!pos) continue
  const col = innerColor(g.content)
  const m = /matrix\(4,0,0,4,([^,]+),([^)]+)\)/.exec(tf)
  const ty = parseFloat(m[2])
  const sx = 4 * pos.x + 1
  const sy = 4 * pos.y + ty + 748.63787
  if (col && COLOR_HEX[col]) {
    const color = COLOR_HEX[col]
    const type = COL_TYPE[pos.x]
    if (!type) continue
    const name = `${color}-${type}`
    if (seen.has(name)) continue
    seen.add(name)
    emit(name, sx, sy, tf, g.content)
  } else if (col === '#000000' && pos.x === 780 && !seen.has('wild4')) {
    // Wild +4 (on-canvas, x=780 column, black inner with +4 glyph)
    seen.add('wild4')
    emit('wild4', sx, sy, tf, g.content)
  }
}

// copy the provided card back image
copyFileSync('assets/unoback.png', `${OUT}/back.png`)

console.log('cropped cards:', [...seen].sort().join(', '), '+ back.png')