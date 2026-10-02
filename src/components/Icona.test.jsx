import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Icona } from './Icona.jsx'
import { TUTTI_I_MODULI } from '../lib/moduli'

// Markup interno di ogni icona, copiato dalla specifica del redesign (Blocco 4).
const SPEC = {
  farmaci: '<path d="M18 3l3 3-9 9-4 1 1-4 9-9z"/><path d="M14 6l4 4"/><path d="M5 16l3 3"/><path d="M3 21l3-3"/>',
  infusione: '<path d="M12 2v6"/><path d="M8 8h8l-1 13a1 1 0 01-1 1H10a1 1 0 01-1-1L8 8z"/><circle cx="12" cy="13" r="2"/>',
  antibiotici: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M12 8v10"/>',
  al: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>',
  emergenze: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  pediatria: '<circle cx="9" cy="7" r="3.2"/><circle cx="17" cy="9" r="2"/><path d="M4 20c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5"/><path d="M15 20c0-2.2-1-3.8-2.5-4.6"/>',
  ostetricia: '<path d="M12 20s-7-4.4-7-9.8A4.2 4.2 0 0112 7a4.2 4.2 0 017 3.2C19 15.6 12 20 12 20z"/><path d="M9 11h2l1-2 1 3 1-2h2"/>',
  'calcolatori-ti': '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  punteggi: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M8 11l2.5 2.5L16 8"/>',
  ventilazione: '<path d="M9 3c-3 0-5 3-5 7 0 5 2 9 4 9 1.3 0 1.3-2 2-2s.7 2 2 2 2-2 2-2 .7 2 2 2c2 0 4-4 4-9 0-4-2-7-5-7-1.3 0-1.7 1-3 1s-1.7-1-3-1z"/>',
  nutrizione: '<path d="M4 12a5 5 0 0110 0v6H4v-6z"/><path d="M20 12a5 5 0 00-7-4.6"/><path d="M14 18h6v-3"/>',
  profilo: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
}

function interno(html) {
  return html
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/><\/(path|circle|rect)>/g, '/>')
}

describe('Icona: set di icone del redesign', () => {
  for (const [nome, markup] of Object.entries(SPEC)) {
    it(`${nome}: geometria identica alla specifica`, () => {
      expect(interno(renderToStaticMarkup(<Icona nome={nome} />))).toBe(markup)
    })
  }

  it('ogni modulo del menu (profilo incluso) ha la sua icona', () => {
    for (const m of TUTTI_I_MODULI) {
      expect(Object.keys(SPEC)).toContain(m.id)
    }
  })

  it('stile comune: viewBox 24, fill none, stroke corrente, spessore 2, estremi arrotondati', () => {
    const html = renderToStaticMarkup(<Icona nome="farmaci" size={24} />)
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('fill="none"')
    expect(html).toContain('stroke="currentColor"')
    expect(html).toContain('stroke-width="2"')
    expect(html).toContain('stroke-linecap="round"')
    expect(html).toContain('stroke-linejoin="round"')
    expect(html).toContain('aria-hidden="true"')
  })
})
