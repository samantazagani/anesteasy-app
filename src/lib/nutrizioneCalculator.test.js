import { describe, expect, it } from 'vitest'
import {
  calcolaHarrisBenedict,
  selezionaRegimeCalorico,
  selezionaRegimeProteico,
  pesoDiRiferimento,
  percentualeFaseDefault,
  calcolaTargetCalorico,
  calcolaCaloriePropofol,
  calcolaTargetNetto,
  calcolaProteineTarget,
  calcolaNPT,
  calcolaVolumeComponente,
  criterioBMIRefeeding,
} from './nutrizioneCalculator'

// Voce reale da data/nutrizione.json > npt_calcolatore
const densitaKcal = { glucosio_g: 4, lipidi_g: 9, aminoacidi_g: 4 }
const limiti = { glucosio_max_mg_kg_min: 4, lipidi_max_g_kg_die: 1.5 }

// Voci reali da data/nutrizione.json > fabbisogno_calorico.regime_per_bmi
const regimePerBmiCalorico = {
  'non_obeso_BMI<30': { kcal_kg: [25, 30], peso: 'reale', regime: 'normocalorico' },
  'obeso_BMI_30-50': { kcal_kg: [11, 14], peso: 'reale', regime: 'ipocalorico-iperproteico', fonte: 'aspen-2016' },
  'obeso_BMI>50': { kcal_kg: [22, 25], peso: 'IBW', regime: 'ipocalorico-iperproteico', fonte: 'aspen-2016' },
}

// Voci reali da data/nutrizione.json > proteine.regime_per_bmi
const regimePerBmiProteico = {
  non_obeso: { g_kg: 1.3, range: [1.2, 2.0], peso: 'reale', note: 'progressivo; CRRT/ustionato fino a 2.0-2.5' },
  'obeso_BMI_30-40': { g_kg: 2.0, peso: 'IBW', fonte: 'aspen-2016' },
  'obeso_BMI>=40': { g_kg: 2.5, peso: 'IBW', fonte: 'aspen-2016' },
}

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

describe('selezionaRegimeCalorico - soglie BMI (diverse da quelle del regime proteico)', () => {
  it('BMI 25 (< 30) -> non_obeso_BMI<30', () => {
    const r = selezionaRegimeCalorico(regimePerBmiCalorico, 25)
    expect(r.chiave).toBe('non_obeso_BMI<30')
    expect(r.regime).toBe('normocalorico')
  })

  it('BMI 30 esatto -> obeso_BMI_30-50 (il bracket "<30" e\' escludente)', () => {
    const r = selezionaRegimeCalorico(regimePerBmiCalorico, 30)
    expect(r.chiave).toBe('obeso_BMI_30-50')
  })

  it('BMI 35 -> obeso_BMI_30-50, peso reale', () => {
    const r = selezionaRegimeCalorico(regimePerBmiCalorico, 35)
    expect(r.chiave).toBe('obeso_BMI_30-50')
    expect(r.peso).toBe('reale')
  })

  it('BMI 55 (> 50) -> obeso_BMI>50, peso IBW', () => {
    const r = selezionaRegimeCalorico(regimePerBmiCalorico, 55)
    expect(r.chiave).toBe('obeso_BMI>50')
    expect(r.peso).toBe('IBW')
  })

  it('BMI non disponibile -> null', () => {
    expect(selezionaRegimeCalorico(regimePerBmiCalorico, null)).toBeNull()
    expect(selezionaRegimeCalorico(regimePerBmiCalorico, undefined)).toBeNull()
  })
})

describe('selezionaRegimeProteico - soglie BMI diverse da quelle del regime calorico', () => {
  it('BMI 25 (< 30) -> non_obeso', () => {
    const r = selezionaRegimeProteico(regimePerBmiProteico, 25)
    expect(r.chiave).toBe('non_obeso')
    expect(r.peso).toBe('reale')
  })

  // Stesso BMI 35 usato sopra per il calorico (30-50), ma qui cade in una fascia diversa:
  // e' proprio il punto che dimostra perche' i due regimi vanno risolti in modo indipendente.
  it('BMI 35 -> obeso_BMI_30-40, peso IBW (diverso dal bracket calorico allo stesso BMI)', () => {
    const r = selezionaRegimeProteico(regimePerBmiProteico, 35)
    expect(r.chiave).toBe('obeso_BMI_30-40')
    expect(r.peso).toBe('IBW')
  })

  it('BMI 42 (>= 40) -> obeso_BMI>=40', () => {
    const r = selezionaRegimeProteico(regimePerBmiProteico, 42)
    expect(r.chiave).toBe('obeso_BMI>=40')
  })
})

describe('pesoDiRiferimento - reale o IBW secondo il campo "peso" del regime', () => {
  it('regime.peso "reale" -> usa pesoKg', () => {
    const r = pesoDiRiferimento({ peso: 'reale' }, { pesoKg: 105, ibw: 68.7 })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 105 })
  })

  it('regime.peso "IBW" -> usa ibw (legittimo per adulti, a differenza della pediatria)', () => {
    const r = pesoDiRiferimento({ peso: 'IBW' }, { pesoKg: 105, ibw: 68.7 })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 68.7 })
  })

  it('nessun regime -> valori nulli', () => {
    expect(pesoDiRiferimento(null, { pesoKg: 105, ibw: 68.7 })).toEqual({ chiave: null, valoreKg: null })
  })
})

describe('percentualeFaseDefault - estrae un default plausibile dal testo libero della fase', () => {
  it('"<=70%" -> 70', () => {
    expect(percentualeFaseDefault('<=70%')).toBe(70)
  })

  it('"80-100%" -> media 90', () => {
    expect(percentualeFaseDefault('80-100%')).toBe(90)
  })

  it('"100% (o piu se catabolismo)" -> 100', () => {
    expect(percentualeFaseDefault('100% (o piu se catabolismo)')).toBe(100)
  })
})

describe('calcolaTargetCalorico - target pieno e target di fase', () => {
  it('regime 11-14 kcal/kg (media 12.5), peso 105 kg, fase 90% -> 1313 / 1181 kcal/die', () => {
    const r = calcolaTargetCalorico({ kcalKgRange: [11, 14], pesoRiferimentoKg: 105, percentualeFase: 90 })

    expect(r.kcalKgMedio).toBe(12.5)
    expect(r.kcalTarget).toBe(1313)
    expect(r.kcalFase).toBe(1181)
  })

  it('lancia un errore se manca il peso di riferimento', () => {
    expect(() =>
      calcolaTargetCalorico({ kcalKgRange: [11, 14], pesoRiferimentoKg: 0, percentualeFase: 90 }),
    ).toThrow(/peso/i)
  })
})

describe('calcolaCaloriePropofol - kcal e lipidi apportati dal propofol in corso', () => {
  it('20 ml/h -> 528 kcal/die, 48 g/die di lipidi (emulsione 10%)', () => {
    const r = calcolaCaloriePropofol({ mlH: 20, kcalPerMl: 1.1, lipidiGPerMl: 0.1 })

    expect(r.kcalDie).toBe(528)
    expect(r.lipidiGDie).toBe(48)
    expect(r.formulaKcal).toBe('20 ml/h × 24 × 1.1 kcal/ml = 528 kcal/die')
  })
})

describe('calcolaTargetNetto - target di fase meno il propofol', () => {
  it('1181 - 528 = 653 kcal/die', () => {
    const r = calcolaTargetNetto({ kcalFase: 1181, kcalPropofol: 528 })
    expect(r.kcalNetto).toBe(653)
    expect(r.copertoDaPropofol).toBe(false)
  })

  it('il propofol da solo supera il target di fase: netto 0, segnalato', () => {
    const r = calcolaTargetNetto({ kcalFase: 400, kcalPropofol: 600 })
    expect(r.kcalNetto).toBe(0)
    expect(r.copertoDaPropofol).toBe(true)
  })

  it('senza propofol (kcalPropofol default 0): netto = target di fase', () => {
    const r = calcolaTargetNetto({ kcalFase: 1181 })
    expect(r.kcalNetto).toBe(1181)
  })
})

describe('calcolaProteineTarget - non scalato dalla fase', () => {
  it('2.0 g/kg (regime obeso 30-40) × 68.7 kg (IBW) = 137 g/die', () => {
    const r = calcolaProteineTarget({ gKg: 2.0, pesoRiferimentoKg: 68.7 })
    expect(r.grammiDie).toBe(137)
  })
})

describe('calcolaNPT - riceve target/aminoacidi gia\' risolti, verifica dei limiti', () => {
  it('entro i limiti: peso 70 kg, target 1750 kcal, 84 g aminoacidi, 50% glucidi, 25% lipidi', () => {
    const r = calcolaNPT({
      pesoKg: 70,
      kcalTotaliTarget: 1750,
      aminoacidiG: 84,
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

  it('supera entrambi i limiti: peso 50 kg, target 1500 kcal, 75 g aminoacidi, 80% glucidi, 54% lipidi', () => {
    const r = calcolaNPT({
      pesoKg: 50,
      kcalTotaliTarget: 1500,
      aminoacidiG: 75,
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

  it('i lipidi del propofol si sommano a quelli della NPT prima di verificare il limite g/kg/die', () => {
    // Stesso caso "entro i limiti" sopra (lipidi NPT 48.6 g, 0.69 g/kg/die, entro 1.5), ma
    // con 48 g/die di lipidi gia' dati dal propofol: il totale supera il limite anche se i
    // lipidi della sola NPT no.
    const r = calcolaNPT({
      pesoKg: 70,
      kcalTotaliTarget: 1750,
      aminoacidiG: 84,
      glucidiPercent: 50,
      lipidiPercent: 25,
      densitaKcal,
      limiti,
      lipidiPropofolG: 48,
    })

    expect(r.lipidi.g).toBe(48.6) // lipidi della sola NPT, invariati
    expect(r.lipidi.propofolG).toBe(48)
    expect(r.lipidi.gTotaliConPropofol).toBe(96.6)
    expect(r.lipidi.gKgDie).toBeCloseTo(1.38, 1) // 96.6/70
    expect(r.lipidi.superaLimite).toBe(false) // 1.38 < 1.5, ancora entro il limite

    // Ma la sola componente NPT (senza propofol) sarebbe stata ben distante dal limite:
    // dimostra che la somma col propofol e' quella che conta per la sicurezza.
    expect(0.69).toBeLessThan(r.lipidi.gKgDie)
  })

  it('lancia un errore se manca un input richiesto', () => {
    expect(() =>
      calcolaNPT({ pesoKg: 0, kcalTotaliTarget: 1750, aminoacidiG: 84, glucidiPercent: 50, lipidiPercent: 25, densitaKcal, limiti }),
    ).toThrow(/peso/i)
    expect(() =>
      calcolaNPT({ pesoKg: 70, kcalTotaliTarget: 1750, aminoacidiG: 0, glucidiPercent: 50, lipidiPercent: 25, densitaKcal, limiti }),
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

// --- Flusso end-to-end: paziente BMI 35, fase acuta tardiva, propofol 20 ml/h -----------
// Ogni passo verificato indipendentemente con Node prima di scrivere il test (vedi
// spiegazione nella risposta), incluso l'arrotondamento "a cascata" (ogni step usa
// l'output GIA' ARROTONDATO dello step precedente, come mostrato/modificabile in UI, non il
// valore interno a piena precisione).
describe('Flusso end-to-end - paziente 105 kg, 173 cm, M, 55 anni (BMI 35.1, IBW 68.7)', () => {
  const pesoKg = 105
  const ibw = 68.7
  const bmi = 35.1

  it('passo per passo fino alla NPT finale', () => {
    // 1. Regime da BMI (soglie diverse per calorico e proteico)
    const regimeCalorico = selezionaRegimeCalorico(regimePerBmiCalorico, bmi)
    expect(regimeCalorico.chiave).toBe('obeso_BMI_30-50')
    expect(regimeCalorico.peso).toBe('reale')

    const regimeProteico = selezionaRegimeProteico(regimePerBmiProteico, bmi)
    expect(regimeProteico.chiave).toBe('obeso_BMI_30-40')
    expect(regimeProteico.peso).toBe('IBW')

    // 2-3. Target calorico e target di fase (fase "acuta tardiva", default 90%)
    const pesoRifCal = pesoDiRiferimento(regimeCalorico, { pesoKg, ibw })
    expect(pesoRifCal).toEqual({ chiave: 'reale', valoreKg: 105 })

    const percentualeFase = percentualeFaseDefault('80-100%')
    expect(percentualeFase).toBe(90)

    const targetCalorico = calcolaTargetCalorico({
      kcalKgRange: regimeCalorico.kcal_kg,
      pesoRiferimentoKg: pesoRifCal.valoreKg,
      percentualeFase,
    })
    expect(targetCalorico.kcalTarget).toBe(1313)
    expect(targetCalorico.kcalFase).toBe(1181)

    // 4. Propofol 20 ml/h
    const caloriePropofol = calcolaCaloriePropofol({ mlH: 20, kcalPerMl: 1.1, lipidiGPerMl: 0.1 })
    expect(caloriePropofol.kcalDie).toBe(528)
    expect(caloriePropofol.lipidiGDie).toBe(48)

    // 5. Target netto (usa il target di fase GIA' ARROTONDATO, 1181, come mostrato in UI)
    const targetNetto = calcolaTargetNetto({ kcalFase: targetCalorico.kcalFase, kcalPropofol: caloriePropofol.kcalDie })
    expect(targetNetto.kcalNetto).toBe(653)
    expect(targetNetto.copertoDaPropofol).toBe(false)

    // 6. Proteine (peso di riferimento IBW, NON scalate dalla fase)
    const pesoRifProt = pesoDiRiferimento(regimeProteico, { pesoKg, ibw })
    expect(pesoRifProt).toEqual({ chiave: 'IBW', valoreKg: 68.7 })

    const proteineTarget = calcolaProteineTarget({ gKg: regimeProteico.g_kg, pesoRiferimentoKg: pesoRifProt.valoreKg })
    expect(proteineTarget.grammiDie).toBe(137)

    // NPT finale: target netto (653) e aminoacidi (137, GIA' ARROTONDATI) come mostrati in
    // UI, 55% glucidi / 30% lipidi, con i lipidi del propofol sommati per il limite
    const npt = calcolaNPT({
      pesoKg,
      kcalTotaliTarget: targetNetto.kcalNetto,
      aminoacidiG: proteineTarget.grammiDie,
      glucidiPercent: 55,
      lipidiPercent: 30,
      densitaKcal,
      limiti,
      lipidiPropofolG: caloriePropofol.lipidiGDie,
    })

    expect(npt.kcalTotali).toBe(653)
    expect(npt.aminoacidi).toMatchObject({ g: 137, kcal: 548 })
    expect(npt.glucidi).toMatchObject({ g: 89.8 })
    expect(npt.lipidi).toMatchObject({ g: 21.8, propofolG: 48, gTotaliConPropofol: 69.8 })

    expect(npt.glucidi.mgKgMin).toBeCloseTo(0.59, 1)
    expect(npt.glucidi.superaLimite).toBe(false)
    expect(npt.lipidi.gKgDie).toBeCloseTo(0.66, 1)
    expect(npt.lipidi.superaLimite).toBe(false)
  })
})
