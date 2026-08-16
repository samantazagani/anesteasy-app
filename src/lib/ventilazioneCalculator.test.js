import { describe, expect, it } from 'vitest'
import {
  calcolaPBW,
  calcolaVtTarget,
  calcolaVtPerKgPBW,
  calcolaComplianceStatica,
  calcolaComplianceDinamica,
  calcolaDrivingPressure,
  calcolaMechanicalPower,
  calcolaSpazioMorto,
  calcolaPF,
  calcolaOxygenationIndex,
  calcolaContenutoO2,
  calcolaO2ER,
  calcolaVO2,
  calcolaAutonomiaBombola,
  normalizzaLimite,
  valutaLimite,
} from './ventilazioneCalculator'

// Voci reali da data/ventilazione.json > valori_limite
const limiteVtKg = { id: 'vt_kg', parametro: 'Vt / kg PBW', target: '6 (4-8)', unita: 'ml/kg' }
const limitePplat = { id: 'pplat', parametro: 'Pplateau', soglia_max: 30, unita: 'cmH2O' }
const limiteDrivingPressure = { id: 'driving_pressure', parametro: 'Driving pressure', soglia_max: 15, unita: 'cmH2O' }
const limitePeep = { id: 'peep', parametro: 'PEEP', range: [5, 15], unita: 'cmH2O' }
const limitePpeak = { id: 'ppeak', parametro: 'Ppeak', soglia_max: 35, unita: 'cmH2O' }

describe('calcolaPBW - caso reale per sesso (formula specifica di questo file, non IBW del profilo)', () => {
  it('uomo, 175 cm -> 70.6 kg', () => {
    const r = calcolaPBW({ sesso: 'M', altezzaCm: 175 })
    expect(r.pbwKg).toBe(70.6)
    expect(r.formula).toBe('50 + 0.91 × (175 - 152.4) = 70.6 kg')
  })

  it('donna, 160 cm -> 52.4 kg', () => {
    const r = calcolaPBW({ sesso: 'F', altezzaCm: 160 })
    expect(r.pbwKg).toBe(52.4)
  })

  it('lancia un errore se il sesso non e\' valido', () => {
    expect(() => calcolaPBW({ sesso: 'X', altezzaCm: 175 })).toThrow(/sesso/i)
  })
})

describe('calcolaVtTarget', () => {
  it('PBW 70.6 kg, 6 ml/kg -> 424 ml', () => {
    const r = calcolaVtTarget({ pbwKg: 70.6, mlKg: 6 })
    expect(r.vtMl).toBe(424)
  })
})

describe('calcolaVtPerKgPBW', () => {
  it('Vt 450 ml su PBW 70.6 kg -> 6.4 ml/kg (entro il range 4-8)', () => {
    const r = calcolaVtPerKgPBW({ vtMl: 450, pbwKg: 70.6 })
    expect(r.mlKg).toBe(6.4)
    expect(valutaLimite(r.mlKg, limiteVtKg).ok).toBe(true)
  })

  it('Vt 700 ml su PBW 70.6 kg -> 9.9 ml/kg (fuori dal range 4-8)', () => {
    const r = calcolaVtPerKgPBW({ vtMl: 700, pbwKg: 70.6 })
    expect(valutaLimite(r.mlKg, limiteVtKg).ok).toBe(false)
  })
})

describe('calcolaComplianceStatica', () => {
  it('Vt 450, Pplat 32, PEEP 10 -> 20.5 ml/cmH2O', () => {
    const r = calcolaComplianceStatica({ vtMl: 450, pplat: 32, peep: 10 })
    expect(r.compliance).toBe(20.5)
  })

  it('lancia un errore se Pplat non e\' maggiore della PEEP', () => {
    expect(() => calcolaComplianceStatica({ vtMl: 450, pplat: 10, peep: 10 })).toThrow(/Pplat/)
  })
})

describe('calcolaComplianceDinamica', () => {
  it('Vt 450, Ppeak 38, PEEP 10 -> 16.1 ml/cmH2O', () => {
    const r = calcolaComplianceDinamica({ vtMl: 450, ppeak: 38, peep: 10 })
    expect(r.compliance).toBe(16.1)
  })
})

describe('calcolaDrivingPressure - caso reale: supera la soglia', () => {
  it('Pplat 32, PEEP 10 -> 22 cmH2O, sopra la soglia 15 (rosso)', () => {
    const r = calcolaDrivingPressure({ pplat: 32, peep: 10 })
    expect(r.drivingPressure).toBe(22)

    const valutazione = valutaLimite(r.drivingPressure, limiteDrivingPressure)
    expect(valutazione.ok).toBe(false)
  })

  it('Pplat 20, PEEP 10 -> 10 cmH2O, entro la soglia 15 (verde)', () => {
    const r = calcolaDrivingPressure({ pplat: 20, peep: 10 })
    expect(r.drivingPressure).toBe(10)
    expect(valutaLimite(r.drivingPressure, limiteDrivingPressure).ok).toBe(true)
  })
})

describe('calcolaMechanicalPower (coefficiente da verificare con la fonte, formula comunque testata)', () => {
  it('RR 18, Vt 450 ml, Ppeak 38, Pplat 32, PEEP 10 -> 21.43 J/min', () => {
    const r = calcolaMechanicalPower({ rr: 18, vtMl: 450, ppeak: 38, pplat: 32, peep: 10 })
    expect(r.power).toBe(21.43)
  })
})

describe('calcolaSpazioMorto (Bohr-Enghoff)', () => {
  it('PaCO2 45, PetCO2 30 -> 0.33', () => {
    const r = calcolaSpazioMorto({ paCO2: 45, petCO2: 30 })
    expect(r.vdVt).toBe(0.33)
  })
})

describe('calcolaPF', () => {
  it('PaO2 90, FiO2 0.5 -> 180', () => {
    const r = calcolaPF({ paO2: 90, fiO2: 0.5 })
    expect(r.pf).toBe(180)
  })

  it('lancia un errore se FiO2 non e\' una frazione 0-1', () => {
    expect(() => calcolaPF({ paO2: 90, fiO2: 50 })).toThrow(/FiO2/)
  })
})

describe('calcolaOxygenationIndex', () => {
  it('FiO2 0.5, Paw media 20, PaO2 90 -> 11.1', () => {
    const r = calcolaOxygenationIndex({ fiO2: 0.5, pawMedia: 20, paO2: 90 })
    expect(r.oi).toBe(11.1)
  })
})

describe('calcolaContenutoO2', () => {
  it('Hb 12, saturazione 0.97, pO2 90 -> 15.87 ml/dL', () => {
    const r = calcolaContenutoO2({ hb: 12, saturazione: 0.97, pO2: 90 })
    expect(r.cO2).toBe(15.87)
  })
})

describe('calcolaO2ER', () => {
  it('Hb 12, SaO2 0.97/PaO2 90, SvO2 0.70/PvO2 40 -> CaO2 15.87, CvO2 11.38, O2ER 0.28', () => {
    const r = calcolaO2ER({ hb: 12, saO2: 0.97, paO2: 90, svO2: 0.7, pvO2: 40 })
    expect(r.caO2).toBe(15.87)
    expect(r.cvO2).toBe(11.38)
    expect(r.o2er).toBe(0.28)
  })
})

describe('calcolaVO2 (Fick)', () => {
  it('CO 5, stessi gas di calcolaO2ER -> 224 ml/min', () => {
    const r = calcolaVO2({ co: 5, hb: 12, saO2: 0.97, paO2: 90, svO2: 0.7, pvO2: 40 })
    expect(r.vo2).toBe(224)
  })

  it('lancia un errore se manca la portata cardiaca', () => {
    expect(() => calcolaVO2({ co: 0, hb: 12, saO2: 0.97, paO2: 90, svO2: 0.7, pvO2: 40 })).toThrow(/portata cardiaca/i)
  })
})

describe('calcolaAutonomiaBombola', () => {
  it('150 bar, bombola 10 L, flusso 15 L/min -> 100 min', () => {
    const r = calcolaAutonomiaBombola({ pressioneBar: 150, capacitaL: 10, flussoLMin: 15 })
    expect(r.durataMin).toBe(100)
  })
})

describe('normalizzaLimite - le 3 forme di data/ventilazione.json > valori_limite', () => {
  it('range: [5,15] (PEEP)', () => {
    expect(normalizzaLimite(limitePeep)).toEqual({ min: 5, max: 15 })
  })

  it('soglia_max: 30 (Pplateau)', () => {
    expect(normalizzaLimite(limitePplat)).toEqual({ min: null, max: 30 })
  })

  it('target testuale "6 (4-8)" (Vt/kg PBW)', () => {
    expect(normalizzaLimite(limiteVtKg)).toEqual({ min: 4, max: 8 })
  })
})

describe('valutaLimite', () => {
  it('soglia_max: dentro e fuori', () => {
    expect(valutaLimite(28, limitePpeak).ok).toBe(true)
    expect(valutaLimite(40, limitePpeak).ok).toBe(false)
  })

  it('range: dentro, sotto e sopra', () => {
    expect(valutaLimite(8, limitePeep).ok).toBe(true)
    expect(valutaLimite(3, limitePeep).ok).toBe(false)
    expect(valutaLimite(20, limitePeep).ok).toBe(false)
  })
})
