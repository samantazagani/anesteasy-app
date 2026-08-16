import { describe, expect, it } from 'vitest'
import {
  calcolaACT,
  calcolaSodioCorretto,
  calcolaDeficitSodio,
  calcolaDeficitPotassio,
  calcolaAnionGap,
  calcolaGapOsmolare,
  calcolaDeficitIdrico,
  calcolaClearanceCreatinina,
  calcolaCalcioCorretto,
  calcolaWinter,
  calcolaQTc,
  calcolaAaGradient,
  calcolaMAP,
  calcolaShockIndex,
} from './calcolatoriTI'

// "gamma" e "infusione_da_dose_oraria" (i 2 calcolatori restanti dei 15 di
// data/calcolatori-ti.json) non hanno funzioni proprie: riusano calcolaInfusione e
// calcolaMlOrariDaConcentrazione da infusionCalculator.js, gia' testate a fondo in
// infusionCalculator.test.js (incluso un caso specifico per l'uso in questo modulo).

describe('calcolaSodioCorretto', () => {
  // Caso verificato: Na 130, glicemia 400 -> 134.8
  it('Na 130, glicemia 400 -> 134.8', () => {
    const r = calcolaSodioCorretto({ naMisurato: 130, glicemia: 400 })
    expect(r.naCorretto).toBe(134.8)
    expect(r.formula).toBe('130 + 0.016 × (400 - 100) = 134.8 mmol/L')
  })

  it('lancia un errore se manca il sodio misurato', () => {
    expect(() => calcolaSodioCorretto({ naMisurato: 0, glicemia: 100 })).toThrow(/sodio/i)
  })
})

describe('calcolaACT', () => {
  it('uomo: peso × 0.6', () => {
    expect(calcolaACT(70, 'M')).toMatchObject({ act: 42, fattore: 0.6 })
  })

  it('donna: peso × 0.5', () => {
    expect(calcolaACT(70, 'F')).toMatchObject({ act: 35, fattore: 0.5 })
  })
})

describe('calcolaDeficitSodio', () => {
  it('peso 70 kg uomo, Na 125 -> target 135: 420 mmol', () => {
    const r = calcolaDeficitSodio({ pesoKg: 70, sesso: 'M', naAttuale: 125, naTarget: 135 })
    expect(r.deficitMmol).toBe(420)
    expect(r.actL).toBe(42)
  })
})

describe('calcolaDeficitPotassio', () => {
  it('K 3.4 -> 6 step da 0.1 sotto 4.0: 600-1200 mmol (stima grossolana)', () => {
    const r = calcolaDeficitPotassio({ kAttuale: 3.4 })
    expect(r.steps).toBe(6)
    expect(r.deficitMinMmol).toBe(600)
    expect(r.deficitMaxMmol).toBe(1200)
  })

  it('K >= 4.0: nessun deficit stimato da questa formula', () => {
    const r = calcolaDeficitPotassio({ kAttuale: 4.2 })
    expect(r.deficitMinMmol).toBe(0)
    expect(r.deficitMaxMmol).toBe(0)
  })
})

describe('calcolaAnionGap', () => {
  it('Na 140, Cl 100, HCO3 24 -> AG 16', () => {
    const r = calcolaAnionGap({ na: 140, cl: 100, hco3: 24 })
    expect(r.ag).toBe(16)
    expect(r.agCorretto).toBeNull()
  })

  it('con albumina 2.0 -> AG corretto 21', () => {
    const r = calcolaAnionGap({ na: 140, cl: 100, hco3: 24, albumina: 2.0 })
    expect(r.agCorretto).toBe(21)
  })
})

describe('calcolaGapOsmolare', () => {
  it('Na 140, glicemia 90, BUN 14, osm misurata 300 -> calcolata 290, gap 10', () => {
    const r = calcolaGapOsmolare({ na: 140, glicemia: 90, bun: 14, osmMisurata: 300 })
    expect(r.osmCalcolata).toBe(290)
    expect(r.gap).toBe(10)
  })
})

describe('calcolaDeficitIdrico', () => {
  it('peso 70 kg uomo, Na attuale 155 -> ~4.5 L', () => {
    const r = calcolaDeficitIdrico({ pesoKg: 70, sesso: 'M', naAttuale: 155 })
    expect(r.deficitL).toBe(4.5)
    expect(r.actL).toBe(42)
  })
})

describe('calcolaClearanceCreatinina (Cockcroft-Gault)', () => {
  // Caso verificato: 60 anni, 70 kg, creatinina 1.2, uomo -> ~64.8 ml/min
  it('60 anni, 70 kg, creatinina 1.2, uomo -> 64.8 ml/min', () => {
    const r = calcolaClearanceCreatinina({ eta: 60, pesoKg: 70, creatinina: 1.2, sesso: 'M' })
    expect(r.clcrMlMin).toBe(64.8)
  })

  // Stesso caso, donna -> ×0.85 -> ~55.1 ml/min
  it('stesso caso, donna -> ×0.85 -> 55.1 ml/min', () => {
    const r = calcolaClearanceCreatinina({ eta: 60, pesoKg: 70, creatinina: 1.2, sesso: 'F' })
    expect(r.clcrMlMin).toBe(55.1)
  })
})

describe('calcolaCalcioCorretto', () => {
  it('Ca 7.5, albumina 2.0 -> 9.1 mg/dL', () => {
    const r = calcolaCalcioCorretto({ ca: 7.5, albumina: 2.0 })
    expect(r.caCorretto).toBe(9.1)
  })
})

describe('calcolaWinter', () => {
  it('HCO3 10 -> atteso 23 mmHg (range 21-25)', () => {
    const r = calcolaWinter({ hco3: 10 })
    expect(r.atteso).toBe(23)
    expect(r.attesoMin).toBe(21)
    expect(r.attesoMax).toBe(25)
  })
})

describe('calcolaQTc (Bazett)', () => {
  // Caso verificato: QT 400 ms, FC 75 -> 447.2 ms (formula esatta: 400/sqrt(60/75))
  it('QT 400 ms, FC 75 -> 447.2 ms', () => {
    const r = calcolaQTc({ qtMs: 400, fc: 75 })
    expect(r.qtcMs).toBe(447.2)
  })
})

describe('calcolaAaGradient', () => {
  it('FiO2 0.21, PaCO2 40, PaO2 90 (Patm default 760) -> ~9.7 mmHg', () => {
    const r = calcolaAaGradient({ fiO2: 0.21, paCO2: 40, paO2: 90 })
    expect(r.aa).toBe(9.7)
  })

  it('lancia un errore se FiO2 non e\' una frazione 0-1', () => {
    expect(() => calcolaAaGradient({ fiO2: 21, paCO2: 40, paO2: 90 })).toThrow(/FiO2/)
  })
})

describe('calcolaMAP', () => {
  // Caso verificato: 120/80 -> 93.3
  it('120/80 -> 93.3 mmHg', () => {
    const r = calcolaMAP({ pas: 120, pad: 80 })
    expect(r.map).toBe(93.3)
    expect(r.formula).toBe('(120 + 2×80) ÷ 3 = 93.3 mmHg')
  })
})

describe('calcolaShockIndex', () => {
  it('FC 110, PAS 100 -> 1.1', () => {
    const r = calcolaShockIndex({ fc: 110, pas: 100 })
    expect(r.si).toBe(1.1)
  })
})
