import { writeFileSync } from 'node:fs'

// Hand-authored cards in the template's visual style (240x360 viewBox).
// Matches the cropped asset: white rounded card, colored rounded inner,
// tilted white central oval, big glyph + small mirrored corner glyph.

const COLORS = {
  red:    { inner: '#ff5555', name: 'red' },
  yellow: { inner: '#ffaa00', name: 'yellow' },
  green:  { inner: '#55aa55', name: 'green' },
  blue:   { inner: '#5555ff', name: 'blue' },
}

// Central white oval (tilted), matching the asset's path3773 proportions.
const OVAL = `<ellipse cx="120" cy="180" rx="50" ry="92" transform="rotate(-22 120 180)" fill="#ffffff"/>`

function corners(sym, fill) {
  // small corner symbol top-left + bottom-right (rotated 180)
  return `
      <text x="22" y="48" font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900" fill="${fill}" text-anchor="middle" dominant-baseline="middle">${sym}</text>
      <text x="218" y="332" font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900" fill="${fill}" text-anchor="middle" dominant-baseline="middle" transform="rotate(180 218 332)">${sym}</text>`
}

function card(innerFill, centralGlyph, glyphFill, cornerFill) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">
  <rect width="240" height="360" rx="40" ry="40" x="0" y="0" fill="#ffffff" stroke="#000000" stroke-width="2"/>
  <rect width="200" height="320" rx="20" ry="20" x="20" y="20" fill="${innerFill}"/>
  ${OVAL}
  <text x="120" y="180" font-family="Arial Black, Arial, sans-serif" font-size="78" font-weight="900" fill="${glyphFill}" text-anchor="middle" dominant-baseline="middle">${centralGlyph}</text>${corners(centralGlyph, cornerFill)}
</svg>
`
}

// +2 (draw2): one per color, central "+2" in the card color, white corners.
for (const c of Object.values(COLORS)) {
  writeFileSync(`packages/client/public/cards/${c.name}-draw2.svg`, card(c.inner, '+2', c.inner, '#ffffff'))
}

// Wild: black inner, 4-color quadrant oval, no central glyph.
function wildCard(with4) {
  const cx = 120, cy = 180, rx = 64, ry = 104
  const top = `${cx},${cy - ry}`, bot = `${cx},${cy + ry}`, left = `${cx - rx},${cy}`, right = `${cx + rx},${cy}`
  const quadrants = `
    <g transform="rotate(-22 120 180)">
      <path d="M${cx},${cy} L${top} A${rx},${ry} 0 0 0 ${left} Z" fill="#ff5555"/>
      <path d="M${cx},${cy} L${top} A${rx},${ry} 0 0 1 ${right} Z" fill="#5555ff"/>
      <path d="M${cx},${cy} L${bot} A${rx},${ry} 0 0 0 ${right} Z" fill="#55aa55"/>
      <path d="M${cx},${cy} L${bot} A${rx},${ry} 0 0 1 ${left} Z" fill="#ffaa00"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#ffffff" stroke-width="6"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx - 14}" ry="${ry - 14}" fill="none" stroke="#ffffff" stroke-width="3"/>
    </g>`
  const central = with4
    ? `\n  <text x="120" y="180" font-family="Arial Black, Arial, sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">+4</text>${corners('+4', '#ffffff')}`
    : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">
  <rect width="240" height="360" rx="40" ry="40" x="0" y="0" fill="#ffffff" stroke="#000000" stroke-width="2"/>
  <rect width="200" height="320" rx="20" ry="20" x="20" y="20" fill="#000000"/>${quadrants}${central}
</svg>
`
}

writeFileSync('packages/client/public/cards/wild.svg', wildCard(false))

console.log('generated: red-draw2, yellow-draw2, green-draw2, blue-draw2, wild')