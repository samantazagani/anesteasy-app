import { describe, expect, it } from 'vitest'
import { GRUPPI_MODULI, TUTTI_I_MODULI, cercaModuli, trovaModulo } from './moduli'
import { formatEta, righeProfilo } from './profiloFormat'
import { etaFertileEuristica } from './ostetriciaSblocco'

describe('moduli', () => {
  it('11 moduli in 3 gruppi (il profilo non e in lista), nell ordine del menu', () => {
    expect(GRUPPI_MODULI.map((g) => g.etichetta)).toEqual([null, 'Materno-infantile', 'Terapia intensiva'])
    expect(GRUPPI_MODULI.flatMap((g) => g.moduli.map((m) => m.id))).toEqual([
      'farmaci', 'infusione', 'antibiotici', 'al', 'emergenze',
      'pediatria', 'ostetricia',
      'calcolatori-ti', 'punteggi', 'ventilazione', 'nutrizione',
    ])
    expect(trovaModulo('profilo').label).toBe('Profilo paziente')
    expect(TUTTI_I_MODULI).toHaveLength(12)
  })

  it('cercaModuli: per nome o parola chiave, senza distinguere maiuscole; vuoto = nessun risultato', () => {
    expect(cercaModuli('')).toEqual([])
    expect(cercaModuli('  ')).toEqual([])
    expect(cercaModuli('VENT').map((m) => m.id)).toEqual(['ventilazione'])
    expect(cercaModuli('rotem').map((m) => m.id)).toEqual(['calcolatori-ti'])
    expect(cercaModuli('profilo').map((m) => m.id)).toContain('profilo')
    expect(cercaModuli('zzz')).toEqual([])
  })
})

describe('formatEta', () => {
  it('sotto i 3 anni mostra i mesi, da 3 anni solo gli anni interi', () => {
    expect(formatEta(null)).toBeNull()
    expect(formatEta(35)).toBe('35 anni')
    expect(formatEta(3)).toBe('3 anni')
    expect(formatEta(8 / 12)).toBe('8 mesi')
    expect(formatEta(1 / 12)).toBe('1 mese')
    expect(formatEta(1)).toBe('1 anno')
    expect(formatEta(2.5)).toBe('2 anni 6 mesi')
    expect(formatEta(0)).toBe('0 mesi')
  })
})

describe('righeProfilo', () => {
  it('profilo vuoto: null; profilo completo: due righe come nel pannello', () => {
    expect(righeProfilo({ sesso: null, eta: null, pesoKg: null, altezzaCm: null }, null)).toBeNull()
    expect(righeProfilo({ sesso: 'F', eta: 35, pesoKg: 70, altezzaCm: 165 }, 25.7)).toEqual({
      riga1: 'F · 35 anni · 70 kg',
      riga2: '165 cm · BMI 25.7',
    })
  })

  it('profilo parziale: omette i campi mancanti', () => {
    expect(righeProfilo({ sesso: 'M', eta: null, pesoKg: 80, altezzaCm: null }, null)).toEqual({
      riga1: 'M · 80 kg',
      riga2: '',
    })
  })
})

describe('etaFertileEuristica (stessa regola del modulo Ostetricia e del pannello)', () => {
  it('sesso F ed eta 12-50 inclusi', () => {
    expect(etaFertileEuristica('F', 35)).toBe(true)
    expect(etaFertileEuristica('F', 12)).toBe(true)
    expect(etaFertileEuristica('F', 50)).toBe(true)
    expect(etaFertileEuristica('F', 11.9)).toBe(false)
    expect(etaFertileEuristica('F', 51)).toBe(false)
    expect(etaFertileEuristica('M', 35)).toBe(false)
    expect(etaFertileEuristica('F', null)).toBe(false)
    expect(etaFertileEuristica(null, 35)).toBe(false)
  })
})
