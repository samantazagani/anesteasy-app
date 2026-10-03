import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { FIGURA } from './mappaBlocchi'

// Le zone cliccabili sono in coordinate 1024x559: le figure possono avere una risoluzione
// diversa, ma NON un rapporto d'aspetto diverso, altrimenti le zone scivolano sul corpo.

function dimensioniWebp(percorso) {
  const b = readFileSync(percorso)
  expect(b.toString('ascii', 0, 4)).toBe('RIFF')
  expect(b.toString('ascii', 8, 12)).toBe('WEBP')
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), alpha: (b[20] & 0x10) !== 0 }
  }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff), alpha: true }
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false }
}

describe('figure della mappa dei blocchi (public/fig)', () => {
  for (const sesso of ['uomo', 'donna']) {
    for (const vista of ['anteriore', 'posteriore']) {
      it(`${sesso}-${vista}.webp: WebP con trasparenza e stesso rapporto d'aspetto delle zone`, () => {
        const { w, h, alpha } = dimensioniWebp(`public/fig/${sesso}-${vista}.webp`)
        expect(alpha).toBe(true)
        expect(w / h).toBeCloseTo(FIGURA.larghezza / FIGURA.altezza, 2)
      })
    }
  }
})
