import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Icona } from './Icona.jsx'
import { TUTTI_I_MODULI } from '../lib/moduli'

// Markup interno di ogni icona. Specifica del redesign (Blocco 4), con 7 icone riviste su richiesta:
// infusione (sacca), antibiotici (capsula diagonale), emergenze (!), pediatria (orsacchiotto),
// ostetricia (donna incinta), ventilazione (polmoni), nutrizione (hamburger).
const SPEC = {
  farmaci: '<path d="M18 3l3 3-9 9-4 1 1-4 9-9z"/><path d="M14 6l4 4"/><path d="M5 16l3 3"/><path d="M3 21l3-3"/>',
  infusione: '<path d="M12 1.5v2"/><rect x="6.5" y="3.5" width="11" height="11" rx="3"/><path d="M12 6.6c1.5 2 2.3 3.1 2.3 4.1a2.3 2.3 0 01-4.6 0c0-1 .8-2.1 2.3-4.1z"/><path d="M12 14.5v3.2"/><circle cx="12" cy="20.6" r="1" fill="currentColor"/>',
  antibiotici: '<g transform="rotate(-45 12 12)"><rect x="2" y="8" width="20" height="8" rx="4"/><path d="M12 8v8"/></g>',
  al: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>',
  emergenze: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.5" r="0.7" fill="currentColor"/>',
  pediatria: '<path d="M7.2 8.2A2.8 2.8 0 114.6 5.4a2.8 2.8 0 012.6 2.8z"/><path d="M16.8 8.2a2.8 2.8 0 112.6-2.8 2.8 2.8 0 01-2.6 2.8z"/><circle cx="12" cy="13" r="7"/><ellipse cx="12" cy="15.2" rx="2.6" ry="2"/><circle cx="9.3" cy="11.4" r="0.7" fill="currentColor"/><circle cx="14.7" cy="11.4" r="0.7" fill="currentColor"/>',
  ostetricia: '<circle cx="10.2" cy="4.3" r="2.3"/><path d="M9 8.6c-1.4 2.4-1.5 5-.6 7.3l-.4 5.6"/><path d="M11.8 8.6c3.9.4 7 3.2 7 6.8 0 2.7-2.2 4.2-5 4.6l-.4 1.5"/>',
  'calcolatori-ti': '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  punteggi: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M8 11l2.5 2.5L16 8"/>',
  ventilazione: '<path d="M12 3v7"/><path d="M12 10c0 1.2-.8 2-1.8 2.6"/><path d="M12 10c0 1.2.8 2 1.8 2.6"/><path d="M9.8 8.2C6.6 8.6 3.8 12.4 3.8 17.4c0 2.2 1.4 3.2 3.1 2.9 1.8-.3 2.9-1.7 2.9-3.8V8.2z"/><path d="M14.2 8.2c3.2.4 6 4.2 6 9.2 0 2.2-1.4 3.2-3.1 2.9-1.8-.3-2.9-1.7-2.9-3.8V8.2z"/>',
  nutrizione: '<path d="M4 11c0-4 3.6-7 8-7s8 3 8 7H4z"/><path d="M3 14.5c1.2 1 2.2 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0 2.3 1 3.5 0"/><rect x="4" y="17" width="16" height="4" rx="2"/>',
  profilo: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
}

function interno(html) {
  return html
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/><\/(path|circle|rect|ellipse)>/g, '/>')
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
