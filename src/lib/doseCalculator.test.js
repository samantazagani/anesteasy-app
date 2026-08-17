import { describe, expect, it } from 'vitest'
import { calcolaDose, formatoRisultato } from './doseCalculator'

describe('calcolaDose - caso range (min/max)', () => {
  // Caso reale da data/farmaci.json: propofol, contesto "induzione", fascia_eta "adulto".
  it('propofol induzione adulto 1.5-2.5 mg/kg su 70 kg', () => {
    const dose = { min: 1.5, max: 2.5, unita: 'mg/kg' }

    const risultato = calcolaDose(dose, 70)

    expect(risultato.tipo).toBe('range')
    expect(risultato.min).toBe(105)
    expect(risultato.max).toBe(175)
    expect(risultato.unita).toBe('mg')
    expect(risultato.richiedePeso).toBe(true)
    expect(risultato.formula).toBe('1.5–2.5 mg/kg × 70 kg = 105–175 mg')
  })

  it('range con unita non su peso (es. naloxone bolo, fisso in mg) non moltiplica per il peso', () => {
    const dose = { min: 0.04, max: 0.08, unita: 'mg' }

    const risultato = calcolaDose(dose, 70)

    expect(risultato.richiedePeso).toBe(false)
    expect(risultato.min).toBe(0.04)
    expect(risultato.max).toBe(0.08)
    expect(risultato.unita).toBe('mg')
    expect(risultato.formula).toBe('0.04–0.08 mg')
  })

  it('range su unita di infusione mg/kg/h riduce l\'unita di uscita a mg/h', () => {
    // remifentanil mantenimento: 0.05-0.5 mcg/kg/min
    const dose = { min: 0.05, max: 0.5, unita: 'mcg/kg/min' }

    const risultato = calcolaDose(dose, 68)

    expect(risultato.unita).toBe('mcg/min')
    expect(risultato.min).toBe(3.4)
    expect(risultato.max).toBe(34)
    expect(risultato.formula).toBe('0.05–0.5 mcg/kg/min × 68 kg = 3.4–34 mcg/min')
  })

  it('lancia un errore se richiede il peso ma non viene fornito', () => {
    const dose = { min: 1.5, max: 2.5, unita: 'mg/kg' }

    expect(() => calcolaDose(dose)).toThrow(/peso/i)
    expect(() => calcolaDose(dose, 0)).toThrow(/peso/i)
    expect(() => calcolaDose(dose, -10)).toThrow(/peso/i)
  })
})

describe('calcolaDose - caso valore singolo', () => {
  // Caso reale da data/farmaci.json: propofol, contesto "induzione", fascia_eta "anziano".
  it('propofol induzione anziano 1 mg/kg su 60 kg', () => {
    const dose = { valore: 1, unita: 'mg/kg' }

    const risultato = calcolaDose(dose, 60)

    expect(risultato.tipo).toBe('singolo')
    expect(risultato.valore).toBe(60)
    expect(risultato.unita).toBe('mg')
    expect(risultato.richiedePeso).toBe(true)
    expect(risultato.formula).toBe('1 mg/kg × 60 kg = 60 mg')
  })

  it('valore singolo su unita fissa (es. adrenalina arresto adulto, 1 mg) non richiede peso', () => {
    const dose = { valore: 1, unita: 'mg' }

    const risultato = calcolaDose(dose)

    expect(risultato.richiedePeso).toBe(false)
    expect(risultato.valore).toBe(1)
    expect(risultato.unita).toBe('mg')
    expect(risultato.formula).toBe('1 mg')
  })

  it('arrotonda al numero di decimali richiesto', () => {
    // sugammadex reversal: 2 mg/kg su un peso con decimali scomodi
    const dose = { valore: 2, unita: 'mg/kg' }

    const risultato = calcolaDose(dose, 68.7)

    expect(risultato.valore).toBe(137.4)
    expect(risultato.formula).toBe('2 mg/kg × 68.7 kg = 137.4 mg')
  })

  it('rispetta il parametro opzionale decimali', () => {
    const dose = { valore: 0.02, unita: 'mg/kg' }

    const risultato = calcolaDose(dose, 68.7, { decimali: 3 })

    expect(risultato.valore).toBe(1.374)
    expect(risultato.formula).toBe('0.02 mg/kg × 68.7 kg = 1.374 mg')
  })

  it('lancia un errore se manca sia "valore" sia "min"/"max"', () => {
    expect(() => calcolaDose({ unita: 'mg/kg' }, 70)).toThrow(/valore.*min.*max|min.*max.*valore/i)
  })

  it('lancia un errore se manca la unita', () => {
    expect(() => calcolaDose({ valore: 1 }, 70)).toThrow(/unita/i)
  })
})

describe('formatoRisultato - solo il numero finale, per il risultato "in evidenza"', () => {
  it('caso range: "105–175 mg", senza la dose per kg', () => {
    const risultato = calcolaDose({ min: 1.5, max: 2.5, unita: 'mg/kg' }, 70)
    expect(formatoRisultato(risultato)).toBe('105–175 mg')
  })

  it('caso valore singolo: "60 mg"', () => {
    const risultato = calcolaDose({ valore: 1, unita: 'mg/kg' }, 60)
    expect(formatoRisultato(risultato)).toBe('60 mg')
  })
})
