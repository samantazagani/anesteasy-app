import { describe, expect, it } from 'vitest'
import {
  trovaFasciaTuboIOT,
  calcolaTuboIOTFormula,
  calcolaDiametriDisponibili,
  calcolaProfonditaDaDiametro,
  trovaParametriVitali,
  trovaFasciaPerPeso,
  trovaCvc,
  calcolaMantenimento421,
  doseDaIntervallo,
  calcolaVtPediatrico,
  calcolaIBWPediatricoTraubJohnson,
} from './pediatriaCalculator'
import { calcolaDose } from './doseCalculator'

// Voci reali da data/pediatria-presidi.json > presidi.tubo_iot.tabella_eta
const tabellaEtaTuboIOT = [
  { fascia: 'prematuro', diametro_mm: 2.5, profondita_cm: 7 },
  { fascia: 'neonato a termine', diametro_mm: 3.0, profondita_cm: 9 },
  { fascia: '1-6 mesi', diametro_mm: 3.5, profondita_cm: 10 },
  { fascia: '6-12 mesi', diametro_mm: 3.5, profondita_cm: 11 },
  { fascia: '1-2 anni', diametro_mm: 4.0, profondita_cm: 12 },
]

// Voci reali da data/pediatria-presidi.json > parametri_vitali
const parametriVitali = [
  { fascia: 'neonato (0-28 gg)', fc_bpm: [100, 180], pa_sistolica_mmHg: [60, 90], fr_atti_min: [40, 60] },
  { fascia: 'lattante (1-12 mesi)', fc_bpm: [100, 160], pa_sistolica_mmHg: [70, 100], fr_atti_min: [30, 53] },
  { fascia: '1-2 anni', fc_bpm: [90, 150], pa_sistolica_mmHg: [80, 110], fr_atti_min: [22, 37] },
  { fascia: '3-5 anni', fc_bpm: [80, 140], pa_sistolica_mmHg: [80, 110], fr_atti_min: [20, 28] },
  { fascia: '6-11 anni', fc_bpm: [70, 120], pa_sistolica_mmHg: [85, 120], fr_atti_min: [18, 25] },
  { fascia: '12-15 anni', fc_bpm: [60, 100], pa_sistolica_mmHg: [95, 140], fr_atti_min: [12, 20] },
]

// Voci reali da data/pediatria-presidi.json > presidi.lma_per_peso
const lmaPerPeso = [
  { peso_kg: [0, 5], misura: '1' },
  { peso_kg: [5, 10], misura: '1.5' },
  { peso_kg: [10, 20], misura: '2' },
  { peso_kg: [20, 30], misura: '2.5' },
  { peso_kg: [30, 50], misura: '3' },
]

// Voci reali da data/pediatria-presidi.json > presidi.cvc
const cvc = [
  { fascia: 'neonato/lattante', french: 4, lunghezza_cm: [4, 5] },
  { fascia: 'bambino', french: 5, lunghezza_cm: [5, 8] },
  { fascia: '>6 anni', french: '5-7', lunghezza_cm: [8, 12] },
]

describe('tubo IOT - tabella vs formula in base all\'eta', () => {
  it('eta <= 2 anni: usa la tabella (lookup diretto), non le formule', () => {
    expect(trovaFasciaTuboIOT(tabellaEtaTuboIOT, 0.5)).toMatchObject({ fascia: '1-6 mesi' })
    expect(trovaFasciaTuboIOT(tabellaEtaTuboIOT, 2)).toMatchObject({ fascia: '1-2 anni' })
  })

  it('un neonato (eta ~0) cade nella fascia "neonato a termine", non "prematuro"', () => {
    // la prematurita' non e' derivabile dall'eta anagrafica: mai selezionata in automatico.
    expect(trovaFasciaTuboIOT(tabellaEtaTuboIOT, 0)).toMatchObject({ fascia: 'neonato a termine' })
  })

  it('eta > 2 anni: nessuna riga di tabella, si passa alle formule', () => {
    expect(trovaFasciaTuboIOT(tabellaEtaTuboIOT, 6)).toBeNull()
  })

  it('formule tubo IOT per un bambino di 6 anni', () => {
    const r = calcolaTuboIOTFormula(6)

    expect(r.diametroNonCuffiatoMm).toBe(5.5) // 6/4 + 4
    expect(r.diametroCuffiatoMm).toBe(5) // 6/4 + 3.5
    expect(r.profonditaLabbroCm).toBe(15) // 6/2 + 12
    expect(r.profonditaNasaleCm).toBe(18) // 6/2 + 15
    expect(r.formulaNonCuffiato).toBe('6/4 + 4 = 5.5 mm')
    expect(r.formulaProfonditaNasale).toBe('6/2 + 15 = 18 cm')
  })

  it('lancia un errore se l\'eta manca o non e\' valida', () => {
    expect(() => calcolaTuboIOTFormula(0)).toThrow(/eta/i)
    expect(() => calcolaTuboIOTFormula(null)).toThrow(/eta/i)
  })
})

describe('calcolaDiametriDisponibili - bracket di due diametri commerciali', () => {
  // Caso verificato indipendentemente: 4.8mm / incremento 0.5 -> 4.5 e 5.0 (esempio del
  // JSON), consigliato 5.0 (dist 0.2) piu' vicino di 4.5 (dist 0.3).
  it('4.8 mm -> bracket 4.5-5.0, consigliato il piu\' vicino (5.0)', () => {
    const r = calcolaDiametriDisponibili(4.8, { incremento: 0.5 })
    expect(r.inferiore).toBe(4.5)
    expect(r.superiore).toBe(5)
    expect(r.consigliato).toBe(5)
  })

  // Caso verificato: tubo cuffiato a 5 anni -> 5/4 + 3.5 = 4.75mm, esattamente a meta' tra
  // 4.5 e 5.0 (dist 0.25 da entrambi): per il cuffiato si preferisce il difetto (4.5).
  it('pareggio esatto (4.75mm) su tubo cuffiato -> preferisce il difetto (4.5)', () => {
    const r = calcolaDiametriDisponibili(4.75, { incremento: 0.5, cuffiato: true })
    expect(r.consigliato).toBe(4.5)
    expect(r.motivoConsigliato).toMatch(/difetto/i)
  })

  // Stesso pareggio esatto, tubo NON cuffiato: nessuna indicazione clinica contraria nel
  // JSON, si mantiene comunque il difetto come default deterministico.
  it('pareggio esatto (4.75mm) su tubo non cuffiato -> difetto di default (4.5)', () => {
    const r = calcolaDiametriDisponibili(4.75, { incremento: 0.5, cuffiato: false })
    expect(r.consigliato).toBe(4.5)
  })

  it('valore esattamente su un incremento disponibile (4.5mm) -> consigliato se stesso', () => {
    const r = calcolaDiametriDisponibili(4.5, { incremento: 0.5 })
    expect(r.inferiore).toBe(4.5)
    expect(r.superiore).toBe(5)
    expect(r.consigliato).toBe(4.5)
  })

  it('lancia un errore se il valore grezzo manca o non e\' valido', () => {
    expect(() => calcolaDiametriDisponibili(0)).toThrow(/valore grezzo/i)
  })
})

describe('calcolaProfonditaDaDiametro - ricalcolo dal diametro scelto', () => {
  // Caso verificato: profondita_cm = 3 x diametro_interno -> 3 x 4.5 = 13.5
  it('diametro scelto 4.5mm -> profondita 13.5 cm', () => {
    const r = calcolaProfonditaDaDiametro(4.5)
    expect(r.profonditaCm).toBe(13.5)
    expect(r.formula).toBe('3 × 4.5 mm = 13.5 cm')
  })

  it('lancia un errore se il diametro manca o non e\' valido', () => {
    expect(() => calcolaProfonditaDaDiametro(0)).toThrow(/diametro/i)
  })
})

describe('calcolaVtPediatrico', () => {
  it('peso 20 kg, 7 ml/kg -> 140 ml', () => {
    const r = calcolaVtPediatrico({ pesoKg: 20, mlKg: 7 })
    expect(r.vtMl).toBe(140)
  })

  it('lancia un errore se il peso manca', () => {
    expect(() => calcolaVtPediatrico({ pesoKg: 0, mlKg: 7 })).toThrow(/peso/i)
  })
})

describe('calcolaIBWPediatricoTraubJohnson', () => {
  // Caso verificato indipendentemente con Node (non solo atteso a mano): altezza 110 cm ->
  // 2.396 * e^(0.01863*110) = 18.598... -> 18.6 kg (plausibile per un bambino di quella
  // statura, ~4-5 anni)
  it('altezza 110 cm -> 18.6 kg', () => {
    const r = calcolaIBWPediatricoTraubJohnson(110)
    expect(r.ibwKg).toBe(18.6)
  })

  // 3 esempi di riferimento confermati dal nuovo data/pediatria-presidi.json, ciascuno
  // verificato indipendentemente con Node prima di fissarlo qui (stesso approccio del caso
  // 110cm sopra): 2.396*e^(0.01863*100)=15.4375->15.4; 2.396*e^(0.01863*120)=22.4076->22.4;
  // 2.396*e^(0.01863*150)=39.1853->39.2
  it('altezza 100 cm -> 15.4 kg', () => {
    expect(calcolaIBWPediatricoTraubJohnson(100).ibwKg).toBe(15.4)
  })

  it('altezza 120 cm -> 22.4 kg', () => {
    expect(calcolaIBWPediatricoTraubJohnson(120).ibwKg).toBe(22.4)
  })

  it('altezza 150 cm -> 39.2 kg', () => {
    expect(calcolaIBWPediatricoTraubJohnson(150).ibwKg).toBe(39.2)
  })

  it('lancia un errore se l\'altezza manca o non e\' valida', () => {
    expect(() => calcolaIBWPediatricoTraubJohnson(0)).toThrow(/altezza/i)
  })
})

describe('parametri vitali - selezione della fascia corretta', () => {
  it('neonato (10 giorni ~ 0.03 anni)', () => {
    const r = trovaParametriVitali(parametriVitali, 10 / 365)
    expect(r.fascia).toBe('neonato (0-28 gg)')
  })

  it('lattante (6 mesi)', () => {
    const r = trovaParametriVitali(parametriVitali, 0.5)
    expect(r.fascia).toBe('lattante (1-12 mesi)')
  })

  it('bambino di 4 anni', () => {
    const r = trovaParametriVitali(parametriVitali, 4)
    expect(r.fascia).toBe('3-5 anni')
    expect(r.fc_bpm).toEqual([80, 140])
  })

  it('adolescente di 14 anni', () => {
    const r = trovaParametriVitali(parametriVitali, 14)
    expect(r.fascia).toBe('12-15 anni')
  })
})

describe('LMA per peso - selezione della fascia corretta', () => {
  it('lattante di 7 kg -> misura 1.5', () => {
    expect(trovaFasciaPerPeso(lmaPerPeso, 7)).toMatchObject({ misura: '1.5' })
  })

  it('bambino di 15 kg -> misura 2', () => {
    expect(trovaFasciaPerPeso(lmaPerPeso, 15)).toMatchObject({ misura: '2' })
  })

  it('bambino di 25 kg -> misura 2.5', () => {
    expect(trovaFasciaPerPeso(lmaPerPeso, 25)).toMatchObject({ misura: '2.5' })
  })
})

describe('CVC - selezione della fascia corretta', () => {
  it('neonato/lattante (8 mesi)', () => {
    expect(trovaCvc(cvc, 8 / 12)).toMatchObject({ fascia: 'neonato/lattante', french: 4 })
  })

  it('bambino di 4 anni', () => {
    expect(trovaCvc(cvc, 4)).toMatchObject({ fascia: 'bambino', french: 5 })
  })

  it('bambino di 8 anni (>6 anni)', () => {
    expect(trovaCvc(cvc, 8)).toMatchObject({ fascia: '>6 anni', french: '5-7' })
  })
})

describe('mantenimento 4-2-1', () => {
  it('bambino di 25 kg: 4x10 + 2x10 + 1x5 = 65 ml/h', () => {
    const r = calcolaMantenimento421(25)

    expect(r.mlH).toBe(65)
    expect(r.formula).toBe('4×10 + 2×10 + 1×5 = 65 ml/h')
  })

  it('sotto i 10 kg: solo la prima fascia si applica', () => {
    const r = calcolaMantenimento421(8)

    expect(r.mlH).toBe(32)
    expect(r.formula).toBe('4×8 = 32 ml/h')
  })

  it('tra 10 e 20 kg: prime due fasce', () => {
    const r = calcolaMantenimento421(15)

    expect(r.mlH).toBe(50) // 4x10 + 2x5
    expect(r.formula).toBe('4×10 + 2×5 = 50 ml/h')
  })

  it('lancia un errore se il peso manca o non e\' valido', () => {
    expect(() => calcolaMantenimento421(0)).toThrow(/peso/i)
    expect(() => calcolaMantenimento421(null)).toThrow(/peso/i)
  })
})

describe('doseDaIntervallo - adatta { valore: [min,max] } a { min, max } per calcolaDose', () => {
  it('bolo di riempimento (data/pediatria-presidi.json > fluidi.bolo_riempimento)', () => {
    // Senza l'adattatore, dose.valore sarebbe un array e calcolaDose produrrebbe NaN
    // invece di lanciare un errore o calcolare correttamente.
    const doseAdattata = doseDaIntervallo({ valore: [10, 20], unita: 'ml/kg' })
    const r = calcolaDose(doseAdattata, 10)

    expect(r.tipo).toBe('range')
    expect(r.min).toBe(100)
    expect(r.max).toBe(200)
  })
})
