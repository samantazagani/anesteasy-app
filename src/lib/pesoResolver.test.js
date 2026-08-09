import { describe, expect, it } from 'vitest'
import { risolviPeso } from './pesoResolver'

describe('risolviPeso', () => {
  it('usa il peso reale quando la specifica e\' assente', () => {
    const r = risolviPeso(undefined, { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24 })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 70, condizioneApplicata: null })
  })

  it('usa il peso indicato quando la specifica e\' una stringa semplice', () => {
    const r = risolviPeso('IBW', { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24 })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 65, condizioneApplicata: null })
  })

  // Caso reale da farmaci.json: propofol induzione, peso condizionale su BMI>=30.
  it('propofol: paziente non obeso usa il default (reale)', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24 })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 70, condizioneApplicata: null })
  })

  it('propofol: paziente obeso (BMI>=30) passa a IBW', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 120, ibw: 70, lbw: 80, bmi: 34 })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 70, condizioneApplicata: 'BMI>=30' })
  })

  it('con BMI esattamente al confine (30) applica comunque IBW', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 100, ibw: 68, lbw: 75, bmi: 30 })
    expect(r.chiave).toBe('IBW')
  })

  it('condizionale senza BMI noto ricade sul default', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: null, ibw: null, lbw: null, bmi: null })
    expect(r.chiave).toBe('reale')
    expect(r.valoreKg).toBeNull()
  })
})
