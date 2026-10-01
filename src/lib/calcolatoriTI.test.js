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
  calcolaEGFRCKDEPI,
  calcolaCalcioCorretto,
  calcolaWinter,
  calcolaQTc,
  calcolaAaGradient,
  calcolaMAP,
  calcolaShockIndex,
  calcolaCPP,
  coeffACTAdrogue,
  calcolaCorrezioneSodioAdrogue,
  calcolaPIAConversione,
  calcolaInfusioneDoseUnita,
} from './calcolatoriTI'

// "gamma" (l'unico calcolatore rimasto senza una funzione propria qui) riusa
// calcolaInfusione da infusionCalculator.js, gia' testata a fondo in
// infusionCalculator.test.js. "infusione_da_dose_oraria" aveva anch'esso riusato
// calcolaMlOrariDaConcentrazione (ancora vero per l'omonimo calcolatore del Modulo 1, "Dose
// oraria -> ml/h"), ma qui e' stato sostituito dalla versione potenziata bidirezionale
// calcolaInfusioneDoseUnita, testata sotto.

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

describe('calcolaEGFRCKDEPI (CKD-EPI 2021)', () => {
  // Caso verificato indipendentemente (calcolo passo-passo con Node, non solo atteso a
  // mano): uomo 60 anni, creatinina 1.2 mg/dL -> Scr/k = 1.2/0.9 = 1.3333 (>1, quindi il
  // termine min usa esponente 1 -> 1; il termine max usa 1.3333^-1.200 = 0.708066;
  // 0.9938^60 = 0.688556; 142 × 0.708066 × 0.688556 = 69.231 -> 69.2
  it('60 anni, creatinina 1.2, uomo -> 69.2 ml/min/1.73m2', () => {
    const r = calcolaEGFRCKDEPI({ eta: 60, sesso: 'M', creatinina: 1.2 })
    expect(r.egfrMlMin173).toBe(69.2)
  })

  // Stesso caso, donna: k=0.7, a=-0.241, ×1.012 finale -> 51.8 (verificato con lo stesso
  // script Node)
  it('stesso caso, donna -> 51.8 ml/min/1.73m2', () => {
    const r = calcolaEGFRCKDEPI({ eta: 60, sesso: 'F', creatinina: 1.2 })
    expect(r.egfrMlMin173).toBe(51.8)
  })

  it('lancia un errore se manca la creatinina', () => {
    expect(() => calcolaEGFRCKDEPI({ eta: 60, sesso: 'M', creatinina: 0 })).toThrow(/creatinina/i)
  })

  it('lancia un errore se il sesso non e\' M/F', () => {
    expect(() => calcolaEGFRCKDEPI({ eta: 60, sesso: '', creatinina: 1.2 })).toThrow(/sesso/i)
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

describe('calcolaCPP', () => {
  // Caso verificato: MAP 80 - ICP 15 = 65
  it('MAP 80, ICP 15 -> 65 mmHg', () => {
    const r = calcolaCPP({ map: 80, icp: 15 })
    expect(r.cpp).toBe(65)
    expect(r.formula).toBe('80 - 15 = 65 mmHg')
  })

  it('lancia un errore se manca la MAP', () => {
    expect(() => calcolaCPP({ map: 0, icp: 15 })).toThrow(/MAP/)
  })
})

describe('coeffACTAdrogue', () => {
  it('uomo non anziano -> 0.6', () => {
    expect(coeffACTAdrogue('M', 40)).toEqual({ chiave: 'uomo', valore: 0.6 })
  })

  it('donna non anziana -> 0.5 (stessa fascia dell\'uomo anziano)', () => {
    expect(coeffACTAdrogue('F', 40)).toEqual({ chiave: 'donna_o_uomo_anziano', valore: 0.5 })
  })

  it('uomo anziano (>=65) -> 0.5', () => {
    expect(coeffACTAdrogue('M', 70)).toEqual({ chiave: 'donna_o_uomo_anziano', valore: 0.5 })
  })

  it('donna anziana (>=65) -> 0.45', () => {
    expect(coeffACTAdrogue('F', 70)).toEqual({ chiave: 'donna_anziana', valore: 0.45 })
  })

  it('confine 65 anni e\' gia\' anziano', () => {
    expect(coeffACTAdrogue('F', 65).chiave).toBe('donna_anziana')
  })
})

describe('calcolaCorrezioneSodioAdrogue', () => {
  // Caso dell'esempio in data/calcolatori-ti.json > correzione_sodio_adrogue.esempio:
  // donna anziana 60 kg, Na 110, ipertonica 3%, target +6 mEq/L/24h -> ~17 ml/h.
  // Verificato passo-passo (non solo l'atteso "~17" del JSON, che e' gia' arrotondato):
  // ACT = 60*0.45 = 27; deltaNa/L = (513-110)/28 = 14.392857...; volume24h = 6/14.392857
  // = 0.4168734 L = 416.8734 ml; velocita = 416.8734/24 = 17.369... -> 17.4 ml/h.
  it('donna anziana 60 kg, Na 110, ipertonica 3%, target +6 -> ~17.4 ml/h', () => {
    const r = calcolaCorrezioneSodioAdrogue({
      naPaziente: 110,
      pesoKg: 60,
      sesso: 'F',
      eta: 78,
      soluzione: 'ipertonica_3%',
      targetDeltaNa24h: 6,
    })

    expect(r.coeffChiave).toBe('donna_anziana')
    expect(r.actL).toBe(27)
    expect(r.deltaNaPerLitro).toBe(14.39)
    expect(r.volumeMl24h).toBe(417)
    expect(r.velocitaMlH).toBe(17.4)
    expect(r.superaLimiteAltoRischio).toBe(false)
    expect(r.superaLimiteAssoluto).toBe(false)
  })

  it('uomo giovane 70 kg, Na 118, fisiologica 0.9%, target +8 (limite standard)', () => {
    // ACT = 70*0.6 = 42; deltaNa/L = (154-118)/43 = 0.837209...; volume24h =
    // 8/0.837209 = 9.5556 L -> velocita = 9555.6/24 = 398.15 ml/h (fisiologica corregge
    // molto piu' lentamente dell'ipertonica: volume enorme, atteso).
    const r = calcolaCorrezioneSodioAdrogue({
      naPaziente: 118,
      pesoKg: 70,
      sesso: 'M',
      eta: 45,
      soluzione: 'fisiologica_0.9%',
      targetDeltaNa24h: 8,
    })

    expect(r.coeffChiave).toBe('uomo')
    expect(r.deltaNaPerLitro).toBe(0.84)
    expect(r.superaLimiteAltoRischio).toBe(true)
    expect(r.superaLimiteAssoluto).toBe(false)
  })

  it('target oltre il tetto assoluto (>8 mEq/L/24h) segnala superaLimiteAssoluto', () => {
    const r = calcolaCorrezioneSodioAdrogue({
      naPaziente: 110,
      pesoKg: 60,
      sesso: 'F',
      eta: 78,
      soluzione: 'ipertonica_3%',
      targetDeltaNa24h: 10,
    })

    expect(r.superaLimiteAltoRischio).toBe(true)
    expect(r.superaLimiteAssoluto).toBe(true)
  })

  it('lancia un errore se manca il sodio del paziente', () => {
    expect(() =>
      calcolaCorrezioneSodioAdrogue({
        naPaziente: 0,
        pesoKg: 60,
        sesso: 'F',
        eta: 78,
        soluzione: 'ipertonica_3%',
        targetDeltaNa24h: 6,
      }),
    ).toThrow(/sodio/i)
  })

  it('lancia un errore se la soluzione non e\' riconosciuta', () => {
    expect(() =>
      calcolaCorrezioneSodioAdrogue({
        naPaziente: 110,
        pesoKg: 60,
        sesso: 'F',
        eta: 78,
        soluzione: 'ringer',
        targetDeltaNa24h: 6,
      }),
    ).toThrow(/soluzione/i)
  })
})

describe('calcolaPIAConversione', () => {
  it('6 mmHg -> 8.2 cmH2O (arrotondato a 1 decimale), livello normale', () => {
    const r = calcolaPIAConversione({ valore: 6, unitaDiPartenza: 'mmHg' })
    expect(r.convertito).toBe(8.2)
    expect(r.unitaConvertita).toBe('cmH2O')
    expect(r.valoreMmHg).toBe(6)
    expect(r.livello).toBe('normale')
  })

  it('10 mmHg -> livello elevato (sopra il range normale, non ancora IAH)', () => {
    const r = calcolaPIAConversione({ valore: 10, unitaDiPartenza: 'mmHg' })
    expect(r.livello).toBe('elevato')
  })

  it('15 mmHg -> ipertensione intra-addominale (>12)', () => {
    const r = calcolaPIAConversione({ valore: 15, unitaDiPartenza: 'mmHg' })
    expect(r.livello).toBe('ipertensione_intra_addominale')
  })

  it('25 mmHg -> sindrome compartimentale (>20)', () => {
    const r = calcolaPIAConversione({ valore: 25, unitaDiPartenza: 'mmHg' })
    expect(r.livello).toBe('sindrome_compartimentale')
  })

  it('20 cmH2O -> 14.7 mmHg (ipertensione intra-addominale)', () => {
    const r = calcolaPIAConversione({ valore: 20, unitaDiPartenza: 'cmH2O' })
    expect(r.convertito).toBe(14.7)
    expect(r.unitaConvertita).toBe('mmHg')
    expect(r.valoreMmHg).toBe(14.7)
    expect(r.livello).toBe('ipertensione_intra_addominale')
  })

  it('lancia un errore se l\'unita di partenza non e\' valida', () => {
    expect(() => calcolaPIAConversione({ valore: 10, unitaDiPartenza: 'kPa' })).toThrow(/unita/i)
  })
})

describe('calcolaInfusioneDoseUnita', () => {
  // Esempio di data/calcolatori-ti.json > infusione_da_dose_oraria: 250 mg in 50 ml
  // (5 mg/ml = 5000 mcg/ml), 1 mg/min -> 12 ml/h. Verificato passo-passo con Node (vedi
  // risposta) prima di scriverlo: 1 mg/min = 1000 mcg/min; 1000/5000*60 = 12.
  it('250 mg in 50 ml, dose 1 mg/min -> 12 ml/h (esempio del JSON), con tutte le equivalenze', () => {
    const r = calcolaInfusioneDoseUnita({
      quantitaFarmaco: 250,
      quantitaUnita: 'mg',
      volumeTotaleMl: 50,
      doseValore: 1,
      doseUnita: 'mg/min',
    })

    expect(r.concMcgMl).toBe(5000)
    expect(r.equivalenze).toEqual({ mlH: 12, mgMin: 1, mcgMin: 1000, mgH: 60, mcgH: 60000 })
  })

  it('direzione inversa: stessa diluizione, partendo da 12 ml/h -> stesse equivalenze (round-trip)', () => {
    const r = calcolaInfusioneDoseUnita({ quantitaFarmaco: 250, quantitaUnita: 'mg', volumeTotaleMl: 50, mlH: 12 })
    expect(r.equivalenze).toEqual({ mlH: 12, mgMin: 1, mcgMin: 1000, mgH: 60, mcgH: 60000 })
  })

  // Caso con unita mcg (es. noradrenalina): 4 mg in 50 ml, dose 10 mcg/min -> 7.5 ml/h.
  it('4 mg in 50 ml, dose 10 mcg/min -> 7.5 ml/h', () => {
    const r = calcolaInfusioneDoseUnita({
      quantitaFarmaco: 4,
      quantitaUnita: 'mg',
      volumeTotaleMl: 50,
      doseValore: 10,
      doseUnita: 'mcg/min',
    })

    expect(r.concMcgMl).toBe(80)
    expect(r.equivalenze.mlH).toBe(7.5)
    expect(r.equivalenze.mcgMin).toBe(10)
  })

  it('stessa diluizione, dose espressa in mcg/h invece che mcg/min -> stesso risultato', () => {
    const r = calcolaInfusioneDoseUnita({
      quantitaFarmaco: 4,
      quantitaUnita: 'mg',
      volumeTotaleMl: 50,
      doseValore: 600,
      doseUnita: 'mcg/h',
    })

    expect(r.equivalenze.mlH).toBe(7.5)
    expect(r.equivalenze.mcgMin).toBe(10)
  })

  it('lancia un errore se non si specifica ne\' dose ne\' ml/h', () => {
    expect(() => calcolaInfusioneDoseUnita({ quantitaFarmaco: 250, quantitaUnita: 'mg', volumeTotaleMl: 50 })).toThrow(/dose.*ml\/h|specificare/i)
  })

  it('lancia un errore se si specificano entrambi dose e ml/h', () => {
    expect(() =>
      calcolaInfusioneDoseUnita({
        quantitaFarmaco: 250,
        quantitaUnita: 'mg',
        volumeTotaleMl: 50,
        doseValore: 1,
        doseUnita: 'mg/min',
        mlH: 12,
      }),
    ).toThrow(/specificare/i)
  })

  it('lancia un errore se manca la quantita di farmaco o il volume', () => {
    expect(() => calcolaInfusioneDoseUnita({ quantitaFarmaco: 0, quantitaUnita: 'mg', volumeTotaleMl: 50, mlH: 12 })).toThrow(/quantita/i)
    expect(() => calcolaInfusioneDoseUnita({ quantitaFarmaco: 250, quantitaUnita: 'mg', volumeTotaleMl: 0, mlH: 12 })).toThrow(/volume/i)
  })
})
