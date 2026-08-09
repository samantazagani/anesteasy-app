import { describe, expect, it } from 'vitest'
import { selezionaDose, etichettaVariante } from './selezioneDose'
import { categoriaEta } from './categoriaEta'

// Voci reali (semplificate) da farmaci.json > propofol.dosi
const dosiPropofol = [
  { contesto: 'induzione', fascia_eta: 'adulto', min: 1.5, max: 2.5, unita: 'mg/kg' },
  { contesto: 'induzione', fascia_eta: 'anziano', valore: 1, unita: 'mg/kg' },
  { contesto: 'mantenimento', fascia_eta: 'adulto', min: 3, max: 12, unita: 'mg/kg/h' },
]

// Voci reali da farmaci.json > adrenalina.dosi (contesto "arresto"): fascia_eta esplicita
// sia per adulto sia per pediatrico, quindi NON deve mai scattare il fallback su adulto.
const dosiAdrenalinaArresto = [
  { contesto: 'arresto', fascia_eta: 'adulto', valore: 1, unita: 'mg' },
  { contesto: 'arresto', fascia_eta: 'pediatrico', valore: 0.01, unita: 'mg/kg' },
]

// Voci reali da farmaci.json > sugammadex.dosi: stesso contesto "reversal", nessuna
// fascia_eta (quindi tutte implicitamente "adulto"), distinte solo dalla nota clinica.
const dosiSugammadex = [
  { contesto: 'reversal', valore: 2, unita: 'mg/kg', note: 'blocco moderato (TOF 3-4)' },
  { contesto: 'reversal', valore: 4, unita: 'mg/kg', note: 'blocco profondo (PTC 1-2 o TOF <=2)' },
  { contesto: 'reversal', valore: 16, unita: 'mg/kg', note: 'reversal immediato dopo RSI con rocuronio' },
]

// Voci reali da farmaci.json > fentanyl.dosi: stesso contesto "neuroassiale", distinte
// dal campo "via" (intratecale vs peridurale).
const dosiFentanylNeuroassiale = [
  { contesto: 'neuroassiale', via: 'intratecale', min: 10, max: 50, unita: 'mcg' },
  { contesto: 'neuroassiale', via: 'peridurale', min: 0.5, max: 1, unita: 'mcg/kg' },
]

describe('categoriaEta', () => {
  it('classifica pediatrico, adulto, anziano e sconosciuto', () => {
    expect(categoriaEta(10)).toBe('pediatrico')
    expect(categoriaEta(40)).toBe('adulto')
    expect(categoriaEta(70)).toBe('anziano')
    expect(categoriaEta(null)).toBeNull()
  })
})

describe('selezionaDose - fascia eta (un solo candidato)', () => {
  it('sceglie la voce adulto per un paziente adulto', () => {
    const r = selezionaDose(dosiPropofol, 'induzione', 'adulto')
    expect(r.fallback).toBe(false)
    expect(r.fasciaUsata).toBe('adulto')
    expect(r.candidati).toHaveLength(1)
    expect(r.candidati[0].min).toBe(1.5)
  })

  it('sceglie la voce dedicata anziano quando esiste', () => {
    const r = selezionaDose(dosiPropofol, 'induzione', 'anziano')
    expect(r.fallback).toBe(false)
    expect(r.fasciaUsata).toBe('anziano')
    expect(r.candidati[0].valore).toBe(1)
  })

  it('ricade su adulto quando manca la voce anziano per quel contesto', () => {
    const r = selezionaDose(dosiPropofol, 'mantenimento', 'anziano')
    expect(r.fallback).toBe(true)
    expect(r.fasciaUsata).toBe('adulto')
    expect(r.candidati[0].min).toBe(3)
  })

  it('ricade su adulto quando la categoria non e\' nota (eta non inserita)', () => {
    const r = selezionaDose(dosiPropofol, 'induzione', null)
    expect(r.fasciaUsata).toBe('adulto')
  })

  it('restituisce nessun candidato se il contesto non esiste per il farmaco', () => {
    const r = selezionaDose(dosiPropofol, 'reversal', 'adulto')
    expect(r.candidati).toHaveLength(0)
  })

  it('adrenalina arresto: sceglie la voce adulto esatta senza fallback', () => {
    const r = selezionaDose(dosiAdrenalinaArresto, 'arresto', 'adulto')
    expect(r.fallback).toBe(false)
    expect(r.fasciaUsata).toBe('adulto')
    expect(r.candidati).toHaveLength(1)
    expect(r.candidati[0]).toMatchObject({ valore: 1, unita: 'mg' })
  })

  it('adrenalina arresto: sceglie la voce pediatrico esatta senza fallback su adulto', () => {
    const r = selezionaDose(dosiAdrenalinaArresto, 'arresto', 'pediatrico')
    expect(r.fallback).toBe(false)
    expect(r.fasciaUsata).toBe('pediatrico')
    expect(r.candidati).toHaveLength(1)
    expect(r.candidati[0]).toMatchObject({ valore: 0.01, unita: 'mg/kg' })
  })

  it('adrenalina arresto: eta non inserita usa la voce adulto (non pediatrico)', () => {
    const r = selezionaDose(dosiAdrenalinaArresto, 'arresto', null)
    expect(r.fasciaUsata).toBe('adulto')
    expect(r.candidati[0].valore).toBe(1)
  })
})

describe('selezionaDose - piu\' candidati per lo stesso contesto+fascia', () => {
  it('sugammadex reversal: restituisce tutte e tre le varianti cliniche', () => {
    const r = selezionaDose(dosiSugammadex, 'reversal', 'adulto')
    expect(r.candidati).toHaveLength(3)
    expect(r.candidati.map((d) => d.valore)).toEqual([2, 4, 16])
  })

  it('etichettaVariante usa la nota quando non c\'e\' un campo via distintivo', () => {
    const [moderato, profondo, rsi] = dosiSugammadex
    expect(etichettaVariante(moderato, 0)).toBe('blocco moderato (TOF 3-4)')
    expect(etichettaVariante(profondo, 1)).toBe('blocco profondo (PTC 1-2 o TOF <=2)')
    expect(etichettaVariante(rsi, 2)).toBe('reversal immediato dopo RSI con rocuronio')
  })

  it('fentanyl neuroassiale: restituisce entrambe le vie (intratecale e peridurale)', () => {
    const r = selezionaDose(dosiFentanylNeuroassiale, 'neuroassiale', 'adulto')
    expect(r.candidati).toHaveLength(2)
  })

  it('etichettaVariante preferisce la via quando presente', () => {
    const [intratecale, peridurale] = dosiFentanylNeuroassiale
    expect(etichettaVariante(intratecale, 0)).toBe('Intratecale')
    expect(etichettaVariante(peridurale, 1)).toBe('Peridurale')
  })

  it('etichettaVariante ricade su "Opzione N" se mancano sia via sia note', () => {
    expect(etichettaVariante({ contesto: 'x', unita: 'mg' }, 2)).toBe('Opzione 3')
  })
})
