import { describe, expect, it } from 'vitest'
import {
  calcolaHarrisBenedict,
  calcolaNPT,
  calcolaVolumeComponente,
  criterioBMIRefeeding,
} from './nutrizioneCalculator'

// Voce reale da data/nutrizione.json > npt_calcolatore
const densitaKcal = { glucosio_g: 4, lipidi_g: 9, aminoacidi_g: 4 }
const limiti = { glucosio_max_mg_kg_min: 4, lipidi_max_g_kg_die: 1.5 }

describe('calcolaHarrisBenedict - un caso reale per sesso', () => {
  it('uomo: 80 kg, 180 cm, 40 anni, fattore stress 1.3', () => {
    const r = calcolaHarrisBenedict({ sesso: 'M', pesoKg: 80, altezzaCm: 180, eta: 40, fattoreStress: 1.3 })

    expect(r.basaleKcal).toBe(1797)
    expect(r.kcalConStress).toBe(2336)
    expect(r.formulaBasale).toBe('66.5 + (13.75×80) + (5.003×180) - (6.75×40) = 1797 kcal')
    expect(r.formulaStress).toBe('1797 × 1.3 = 2336 kcal')
  })

  it('donna: 60 kg, 165 cm, 35 anni, fattore stress 1.2', () => {
    const r = calcolaHarrisBenedict({ sesso: 'F', pesoKg: 60, altezzaCm: 165, eta: 35, fattoreStress: 1.2 })

    expect(r.basaleKcal).toBe(1370)
    expect(r.kcalConStress).toBe(1645)
    expect(r.formulaBasale).toBe('655.1 + (9.563×60) + (1.850×165) - (4.676×35) = 1370 kcal')
    expect(r.formulaStress).toBe('1370 × 1.2 = 1645 kcal')
  })

  it('senza fattore di stress, restituisce solo il basale (nessun valore derivato in automatico)', () => {
    const r = calcolaHarrisBenedict({ sesso: 'M', pesoKg: 80, altezzaCm: 180, eta: 40 })

    expect(r.basaleKcal).toBe(1797)
    expect(r.kcalConStress).toBeNull()
    expect(r.formulaStress).toBeNull()
  })

  it('lancia un errore se il sesso manca o non e\' M/F', () => {
    expect(() =>
      calcolaHarrisBenedict({ sesso: null, pesoKg: 80, altezzaCm: 180, eta: 40 }),
    ).toThrow(/sesso/i)
  })
})

describe('calcolaNPT - verifica dei limiti (superati / non superati)', () => {
  it('entro i limiti: peso 70 kg, target 25 kcal/kg, 1.2 g/kg aminoacidi, 50% glucidi, 25% lipidi', () => {
    const r = calcolaNPT({
      pesoKg: 70,
      targetKcalKg: 25,
      gKgAminoacidi: 1.2,
      glucidiPercent: 50,
      lipidiPercent: 25,
      densitaKcal,
      limiti,
    })

    expect(r.kcalTotali).toBe(1750)
    expect(r.aminoacidi).toMatchObject({ g: 84, kcal: 336 })
    expect(r.glucidi).toMatchObject({ g: 218.8, kcal: 875 })
    expect(r.lipidi).toMatchObject({ g: 48.6, kcal: 437.5 })

    expect(r.glucidi.mgKgMin).toBeCloseTo(2.17, 1)
    expect(r.glucidi.superaLimite).toBe(false)
    expect(r.lipidi.gKgDie).toBeCloseTo(0.69, 1)
    expect(r.lipidi.superaLimite).toBe(false)
  })

  it('supera entrambi i limiti: peso 50 kg, target 30 kcal/kg, 1.5 g/kg aminoacidi, 80% glucidi, 54% lipidi', () => {
    const r = calcolaNPT({
      pesoKg: 50,
      targetKcalKg: 30,
      gKgAminoacidi: 1.5,
      glucidiPercent: 80,
      lipidiPercent: 54,
      densitaKcal,
      limiti,
    })

    expect(r.kcalTotali).toBe(1500)
    expect(r.glucidi.g).toBe(300)
    expect(r.glucidi.mgKgMin).toBeCloseTo(4.17, 1)
    expect(r.glucidi.superaLimite).toBe(true)

    expect(r.lipidi.g).toBe(90)
    expect(r.lipidi.gKgDie).toBe(1.8)
    expect(r.lipidi.superaLimite).toBe(true)
  })

  it('lancia un errore se manca un input richiesto', () => {
    expect(() =>
      calcolaNPT({ pesoKg: 0, targetKcalKg: 25, gKgAminoacidi: 1.2, glucidiPercent: 50, lipidiPercent: 25, densitaKcal, limiti }),
    ).toThrow(/peso/i)
    expect(() =>
      calcolaNPT({ pesoKg: 70, targetKcalKg: 25, gKgAminoacidi: 0, glucidiPercent: 50, lipidiPercent: 25, densitaKcal, limiti }),
    ).toThrow(/aminoacidi/i)
  })
})

describe('calcolaVolumeComponente', () => {
  it('150 g a concentrazione 20 g/100ml -> 750 ml', () => {
    const r = calcolaVolumeComponente(150, 20)
    expect(r.volumeMl).toBe(750)
    expect(r.formula).toBe('150 g ÷ (20 g/100ml) = 750 ml')
  })
})

describe('criterioBMIRefeeding - confronto automatico col BMI del profilo', () => {
  it('un profilo che rientra nel criterio (BMI < 16)', () => {
    expect(criterioBMIRefeeding(15.4)).toBe(true)
  })

  it('un profilo che NON rientra nel criterio (BMI >= 16)', () => {
    expect(criterioBMIRefeeding(22.1)).toBe(false)
    expect(criterioBMIRefeeding(16)).toBe(false)
  })

  it('nessun BMI disponibile (profilo incompleto): non segnala il criterio', () => {
    expect(criterioBMIRefeeding(null)).toBe(false)
    expect(criterioBMIRefeeding(undefined)).toBe(false)
  })
})
