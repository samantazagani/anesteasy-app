import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BadgeProfilo } from './BadgeProfilo.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { etaFertileEuristica } from '../lib/ostetriciaSblocco'

const render = (sesso, eta) =>
  renderToStaticMarkup(
    <BadgeProfilo categoria={categoriaEta(eta)} ostetricia={etaFertileEuristica(sesso, eta)} />,
  )

describe('BadgeProfilo', () => {
  it('donna adulta: categoria Adulto + Ostetricia sbloccata', () => {
    const html = render('F', 35)
    expect(html).toContain('Categoria: Adulto')
    expect(html).toContain('badge-accent')
    expect(html).toContain('Ostetricia sbloccata')
    expect(html).toContain('badge-success')
  })

  it('uomo adulto: nessun badge Ostetricia', () => {
    const html = render('M', 35)
    expect(html).toContain('Categoria: Adulto')
    expect(html).not.toContain('Ostetricia')
  })

  it('anziana oltre i 50 anni: Anziano, Ostetricia non sbloccata', () => {
    const html = render('F', 70)
    expect(html).toContain('Categoria: Anziano')
    expect(html).not.toContain('Ostetricia')
  })

  it('bambino: Pediatrico, nessuna Ostetricia', () => {
    const html = render('M', 6)
    expect(html).toContain('Categoria: Pediatrico')
    expect(html).not.toContain('Ostetricia')
  })

  it('adolescente F di 15 anni: la regola reale (F, 12-50) sblocca Ostetricia anche se Pediatrica', () => {
    const html = render('F', 15)
    expect(html).toContain('Categoria: Pediatrico')
    expect(html).toContain('Ostetricia sbloccata')
  })

  it('eta non inserita: invito a inserirla, nessuna categoria inventata', () => {
    const html = render('F', null)
    expect(html).toMatch(/Categoria: inserisci l.+età/)
    expect(html).not.toContain('Adulto')
    expect(html).not.toContain('Ostetricia')
  })
})
