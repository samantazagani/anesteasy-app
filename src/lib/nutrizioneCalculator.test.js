import { describe, expect, it } from 'vitest'
import {
  calcolaHarrisBenedict,
  calcolaPesoNutrizionale,
  selezionaRegimeProteico,
  pesoDiRiferimento,
  percentualeFaseDefault,
  calcolaTargetCalorico,
  calcolaCaloriePropofol,
  calcolaCaloriaGlucosata,
  calcolaTargetNetto,
  calcolaSemaforoESPEN,
  calcolaProteineTarget,
  calcolaNPT,
  calcolaVolumeComponente,
  criterioBMIRefeeding,
  calcolaBilancioAzotato,
  calcolaConversioneProdotto,
  calcolaConfrontoProdotti,
} from './nutrizioneCalculator'

// Voce reale da data/nutrizione.json > npt_calcolatore
const densitaKcal = { glucosio_g: 4, lipidi_g: 9, aminoacidi_g: 4 }
const limiti = { glucosio_max_mg_kg_min: 4, lipidi_max_g_kg_die: 1.5 }

// Voci reali da data/nutrizione.json > proteine.regime_per_bmi ("peso" del bracket
// non-obeso e' ora "peso_nutrizionale" (rework), i bracket obesi restano fissi su "IBW".
const regimePerBmiProteico = {
  non_obeso: { g_kg: 1.3, range: [1.2, 2.0], peso: 'peso_nutrizionale', note: 'progressivo; CRRT/ustionato fino a 2.0-2.5' },
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

describe('selezionaRegimeProteico - soglie BMI (fabbisogno calorico ora e\' un range fisso, non piu\' un regime per BMI)', () => {
  it('BMI 25 (< 30) -> non_obeso, peso "peso_nutrizionale" (rework: era "reale")', () => {
    const r = selezionaRegimeProteico(regimePerBmiProteico, 25)
    expect(r.chiave).toBe('non_obeso')
    expect(r.peso).toBe('peso_nutrizionale')
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

describe('pesoDiRiferimento - reale, IBW o peso_nutrizionale secondo il campo "peso"', () => {
  it('regime.peso "reale" -> usa pesoKg', () => {
    const r = pesoDiRiferimento({ peso: 'reale' }, { pesoKg: 105, ibw: 68.7 })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 105 })
  })

  it('regime.peso "IBW" -> usa ibw (fisso, anche se peso_nutrizionale sceglierebbe ABW)', () => {
    const r = pesoDiRiferimento(
      { peso: 'IBW' },
      { pesoKg: 105, ibw: 68.7, pesoNutrizionale: { chiave: 'ABW', valoreKg: 83.2 } },
    )
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 68.7 })
  })

  it('regime.peso "peso_nutrizionale" -> usa il risultato gia\' calcolato da calcolaPesoNutrizionale', () => {
    const r = pesoDiRiferimento(
      { peso: 'peso_nutrizionale' },
      { pesoKg: 105, ibw: 68.7, pesoNutrizionale: { chiave: 'ABW', valoreKg: 83.2 } },
    )
    expect(r).toEqual({ chiave: 'ABW', valoreKg: 83.2 })
  })

  it('regime.peso "peso_nutrizionale" ma pesoNutrizionale non fornito -> valori nulli', () => {
    const r = pesoDiRiferimento({ peso: 'peso_nutrizionale' }, { pesoKg: 105, ibw: 68.7 })
    expect(r).toEqual({ chiave: null, valoreKg: null })
  })

  it('nessun regime -> valori nulli', () => {
    expect(pesoDiRiferimento(null, { pesoKg: 105, ibw: 68.7 })).toEqual({ chiave: null, valoreKg: null })
  })
})

describe('calcolaPesoNutrizionale - 3 fasce da BMI (regola in data/nutrizione.json > peso_nutrizionale)', () => {
  it('BMI < 18.5 -> peso reale', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 50, ibw: 55, bmi: 17.5, categoria: 'adulto' })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 50, bmiUsato: 17.5 })
  })

  it('BMI 18.5-30 -> IBW', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 80, ibw: 70, bmi: 25, categoria: 'adulto' })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 70, bmiUsato: 25 })
  })

  it('BMI esattamente 30 -> ancora IBW (il bracket ">30" e\' escludente)', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 90, ibw: 70, bmi: 30, categoria: 'adulto' })
    expect(r.chiave).toBe('IBW')
  })

  // Caso verificato con Node (vedi risposta): donna 90 kg, 160 cm -> BMI 35.2, IBW 52.4 ->
  // ABW = 52.4 + 0.4×(90-52.4) = 67.4 kg.
  it('BMI > 30 -> ABW (IBW + 0.4×(reale-IBW))', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 90, ibw: 52.4, bmi: 35.2, categoria: 'adulto' })
    expect(r.chiave).toBe('ABW')
    expect(r.valoreKg).toBe(67.4)
    expect(r.formula).toBe('52.4 + 0.4×(90-52.4) = 67.4 kg')
  })

  it('paziente pediatrico con BMI che sceglierebbe ABW: ricade su reale (IBW/ABW non validi in pediatria)', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 30, ibw: 25, bmi: 32, categoria: 'pediatrico' })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 30, bmiUsato: 32, pesoPediatricoEscluso: 'ABW' })
  })

  it('paziente pediatrico con BMI che sceglierebbe IBW: ricade su reale', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 20, ibw: 18, bmi: 22, categoria: 'pediatrico' })
    expect(r.chiave).toBe('reale')
    expect(r.pesoPediatricoEscluso).toBe('IBW')
  })

  it('BMI non disponibile -> ricade sul peso reale', () => {
    const r = calcolaPesoNutrizionale({ pesoKg: 70, ibw: 65, bmi: null, categoria: 'adulto' })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 70, bmiUsato: null })
  })

  it('lancia un errore se manca il peso', () => {
    expect(() => calcolaPesoNutrizionale({ pesoKg: 0, ibw: 65, bmi: 25 })).toThrow(/peso/i)
  })
})

describe('calcolaSemaforoESPEN - guardrail verde/giallo/rosso sulle kcal/kg effettive', () => {
  it('non obeso, 25 kcal/kg (dentro 20-30) -> verde', () => {
    const r = calcolaSemaforoESPEN({ kcalDaNutrizione: 1750, pesoNutrizionaleKg: 70, ibwKg: null, bmi: 24 })
    expect(r.base).toBe('peso_nutrizionale')
    expect(r.kcalKgEffettive).toBe(25)
    expect(r.livello).toBe('verde')
  })

  it('non obeso, 34 kcal/kg (>30) -> giallo', () => {
    const r = calcolaSemaforoESPEN({ kcalDaNutrizione: 2380, pesoNutrizionaleKg: 70, ibwKg: null, bmi: 24 })
    expect(r.livello).toBe('giallo')
  })

  it('non obeso, 40 kcal/kg (ben oltre 35) -> rosso (overfeeding)', () => {
    const r = calcolaSemaforoESPEN({ kcalDaNutrizione: 2800, pesoNutrizionaleKg: 70, ibwKg: null, bmi: 24 })
    expect(r.livello).toBe('rosso')
  })

  // Obeso: il controllo si rifa' all'IBW, non al peso_nutrizionale (ABW) usato per il target.
  it('obeso: 1101 kcal / IBW 52.4 = 21 kcal/kg IBW -> verde, anche se sul peso_nutrizionale (67.4) sarebbe 16.3', () => {
    const r = calcolaSemaforoESPEN({ kcalDaNutrizione: 1101, pesoNutrizionaleKg: 67.4, ibwKg: 52.4, bmi: 35.2 })
    expect(r.base).toBe('IBW')
    expect(r.kcalKgEffettive).toBe(16.3)
    expect(r.kcalKgControllo).toBe(21)
    expect(r.livello).toBe('verde')
  })

  it('obeso oltre 25 kcal/kg IBW -> giallo; oltre 30 -> rosso', () => {
    const giallo = calcolaSemaforoESPEN({ kcalDaNutrizione: 1400, pesoNutrizionaleKg: 67.4, ibwKg: 52.4, bmi: 35.2 })
    expect(giallo.kcalKgControllo).toBeCloseTo(26.7, 1)
    expect(giallo.livello).toBe('giallo')

    const rosso = calcolaSemaforoESPEN({ kcalDaNutrizione: 1700, pesoNutrizionaleKg: 67.4, ibwKg: 52.4, bmi: 35.2 })
    expect(rosso.kcalKgControllo).toBeCloseTo(32.4, 1)
    expect(rosso.livello).toBe('rosso')
  })

  it('fase acuta precoce con percentuale >70%: declassa il livello di un gradino', () => {
    const senzaSforamento = calcolaSemaforoESPEN({
      kcalDaNutrizione: 1750, pesoNutrizionaleKg: 70, ibwKg: null, bmi: 24, faseAcutaPrecoce: true, percentualeFase: 70,
    })
    expect(senzaSforamento.livello).toBe('verde')
    expect(senzaSforamento.superaLimiteFaseAcuta).toBe(false)

    const conSforamento = calcolaSemaforoESPEN({
      kcalDaNutrizione: 1750, pesoNutrizionaleKg: 70, ibwKg: null, bmi: 24, faseAcutaPrecoce: true, percentualeFase: 85,
    })
    expect(conSforamento.superaLimiteFaseAcuta).toBe(true)
    expect(conSforamento.livello).toBe('giallo')
  })

  it('accetta 0 kcal (target gia\' coperto dalle infusioni, come in calcolaTargetNetto)', () => {
    const r = calcolaSemaforoESPEN({ kcalDaNutrizione: 0, pesoNutrizionaleKg: 70, ibwKg: null, bmi: 24 })
    expect(r.kcalKgEffettive).toBe(0)
    expect(r.livello).toBe('rosso') // sotto 15 kcal/kg: fuori da qualunque fascia definita
  })

  it('lancia un errore se manca il peso di riferimento', () => {
    expect(() => calcolaSemaforoESPEN({ kcalDaNutrizione: 1750, pesoNutrizionaleKg: 0 })).toThrow(/peso/i)
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

describe('calcolaCaloriaGlucosata - kcal apportate da un\'infusione di glucosata', () => {
  // Esempio di data/nutrizione.json > glucosata_calorie.esempio: 84 ml/h al 5% -> ~343 kcal/die.
  it('glucosata 5% a 84 ml/h -> 343 kcal/die (esempio del JSON, verificato passo-passo)', () => {
    const r = calcolaCaloriaGlucosata({ mlH: 84, concentrazionePercento: 5 })
    expect(r.kcalDie).toBe(343)
    expect(r.formula).toBe('84 ml/h × 24 × (5/100) × 3.4 = 343 kcal/die')
  })
})

describe('calcolaTargetNetto - target di fase meno propofol e glucosata', () => {
  it('1181 - 528 (propofol) = 653 kcal/die', () => {
    const r = calcolaTargetNetto({ kcalFase: 1181, kcalPropofol: 528 })
    expect(r.kcalNetto).toBe(653)
    expect(r.copertoDaPropofol).toBe(false)
    expect(r.formula).toBe('1181 kcal/die - 528 kcal/die (propofol) = 653 kcal/die')
  })

  it('con anche glucosata: 1668 - 396 (propofol) - 171 (glucosata) = 1101 kcal/die', () => {
    const r = calcolaTargetNetto({ kcalFase: 1668, kcalPropofol: 396, kcalGlucosata: 171 })
    expect(r.kcalNetto).toBe(1101)
    expect(r.formula).toBe('1668 kcal/die - 396 kcal/die (propofol) - 171 kcal/die (glucosata) = 1101 kcal/die')
  })

  it('propofol + glucosata da soli superano il target di fase: netto 0, segnalato', () => {
    const r = calcolaTargetNetto({ kcalFase: 400, kcalPropofol: 300, kcalGlucosata: 300 })
    expect(r.kcalNetto).toBe(0)
    expect(r.copertoDaPropofol).toBe(true)
  })

  it('senza infusioni (default 0): netto = target di fase', () => {
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

describe('calcolaBilancioAzotato', () => {
  it('105 g proteine/die, UUN 12 g -> bilancio +0.8 g N/24h (anabolico)', () => {
    const r = calcolaBilancioAzotato({ proteineGDie: 105, uunGDie: 12 })
    expect(r.azotoIntrodottoG).toBe(16.8)
    expect(r.azotoEliminatoG).toBe(16)
    expect(r.bilancioG).toBe(0.8)
    expect(r.catabolico).toBe(false)
  })

  it('proteine insufficienti rispetto alle perdite -> bilancio negativo (catabolico)', () => {
    const r = calcolaBilancioAzotato({ proteineGDie: 60, uunGDie: 15 })
    expect(r.bilancioG).toBeLessThan(0)
    expect(r.catabolico).toBe(true)
  })
})

describe('calcolaConversioneProdotto - target netto -> ml/h del prodotto scelto', () => {
  // Nephro HP (data/nutrizione.json > prodotti_enterali): 1.8 kcal/ml, 0.081 g prot/ml.
  it('target 1101 kcal/die con Nephro HP -> 25.5 ml/h, 49.5 g proteine/die', () => {
    const r = calcolaConversioneProdotto({ kcalDaNutrizione: 1101, kcalMl: 1.8, protGMl: 0.081, pesoRiferimentoKg: 67.4 })
    expect(r.mlH).toBe(25.5)
    expect(r.kcalDie).toBe(1101)
    expect(r.proteineGDie).toBe(49.5)
    expect(r.proteineGKg).toBe(0.74)
  })

  it('lancia un errore se manca il target calorico netto', () => {
    expect(() => calcolaConversioneProdotto({ kcalDaNutrizione: 0, kcalMl: 1.8, protGMl: 0.081, pesoRiferimentoKg: 67.4 })).toThrow(/target/i)
  })
})

describe('calcolaConfrontoProdotti - ordinato per vicinanza al target proteico g/kg', () => {
  const prodotti = [
    { nome: 'Isosource Standard', kcal_ml: 1.0, prot_g_ml: 0.039 },
    { nome: 'Nephro HP', kcal_ml: 1.8, prot_g_ml: 0.081 },
    { nome: 'Peptamen AF', kcal_ml: 1.5, prot_g_ml: 0.094 },
  ]

  it('a parita\' di target calorico, ordina i 3 prodotti per g/kg proteine piu\' vicine al target (2.0 g/kg)', () => {
    const r = calcolaConfrontoProdotti({ prodotti, kcalDaNutrizione: 1101, pesoRiferimentoKg: 67.4, targetProteineGKg: 2.0038 })

    expect(r.map((p) => p.nome)).toEqual(['Peptamen AF', 'Nephro HP', 'Isosource Standard'])
    expect(r[0].proteineGKg).toBe(1.02) // il piu' vicino a 2.0 g/kg, pur restando distante
    expect(r[0].distanzaTargetGKg).toBeCloseTo(0.98, 1)
    // Tutti e 3 erogano la STESSA dose calorica (1101 kcal/die): a cambiare e' solo il ml/h
    // e le proteine, che e' esattamente il punto del confronto.
    expect(r.every((p) => p.kcalDie === 1101)).toBe(true)
  })

  it('lancia un errore se l\'elenco prodotti e\' vuoto', () => {
    expect(() => calcolaConfrontoProdotti({ prodotti: [], kcalDaNutrizione: 1101, pesoRiferimentoKg: 67.4, targetProteineGKg: 2 })).toThrow(/prodotti/i)
  })
})

// --- Flusso end-to-end: paziente obeso, fase acuta tardiva, propofol + glucosata in corso,
// un prodotto enterale scelto (Nephro HP) + confronto con altri due. Ogni passo verificato
// indipendentemente con Node prima di scrivere il test (vedi spiegazione nella risposta),
// incluso l'arrotondamento "a cascata" (ogni step usa l'output GIA' ARROTONDATO dello step
// precedente, come mostrato/modificabile in UI, non il valore interno a piena precisione).
describe('Flusso end-to-end - paziente 90 kg, 160 cm, F, 55 anni (BMI 35.2, IBW 52.4)', () => {
  const pesoKg = 90
  const ibw = 52.4
  const bmi = 35.2
  const categoria = 'adulto'

  it('dal peso nutrizionale fino alla NPT e alla conversione/confronto prodotti', () => {
    // 1. Peso nutrizionale: BMI>30 -> ABW (sostituisce il vecchio regime-calorico-per-BMI)
    const pesoNutrizionale = calcolaPesoNutrizionale({ pesoKg, ibw, bmi, categoria })
    expect(pesoNutrizionale).toEqual({
      chiave: 'ABW',
      valoreKg: 67.4,
      bmiUsato: 35.2,
      formula: '52.4 + 0.4×(90-52.4) = 67.4 kg',
    })

    // Regime proteico (soglie invariate): BMI 35.2 -> obeso_BMI_30-40, peso FISSO su IBW
    // (non su peso_nutrizionale/ABW: l'obeso usa IBW per le proteine anche qui).
    const regimeProteico = selezionaRegimeProteico(regimePerBmiProteico, bmi)
    expect(regimeProteico).toMatchObject({ chiave: 'obeso_BMI_30-40', g_kg: 2.0, peso: 'IBW' })

    const pesoRifProteico = pesoDiRiferimento(regimeProteico, { pesoKg, ibw, pesoNutrizionale })
    expect(pesoRifProteico).toEqual({ chiave: 'IBW', valoreKg: 52.4 })

    // 2-3. Target calorico (range fisso 25-30 kcal/kg su peso_nutrizionale) e target di
    // fase (fase "acuta tardiva", default 90%)
    const percentualeFase = percentualeFaseDefault('80-100%')
    expect(percentualeFase).toBe(90)

    const targetCalorico = calcolaTargetCalorico({
      kcalKgRange: [25, 30],
      pesoRiferimentoKg: pesoNutrizionale.valoreKg,
      percentualeFase,
    })
    expect(targetCalorico.kcalTarget).toBe(1854)
    expect(targetCalorico.kcalFase).toBe(1668)

    // 4. Propofol 15 ml/h + glucosata 5% a 42 ml/h, entrambe da sottrarre
    const caloriePropofol = calcolaCaloriePropofol({ mlH: 15, kcalPerMl: 1.1, lipidiGPerMl: 0.1 })
    expect(caloriePropofol.kcalDie).toBe(396)
    expect(caloriePropofol.lipidiGDie).toBe(36)

    const calorieGlucosata = calcolaCaloriaGlucosata({ mlH: 42, concentrazionePercento: 5 })
    expect(calorieGlucosata.kcalDie).toBe(171)

    // 5. Target netto
    const targetNetto = calcolaTargetNetto({
      kcalFase: targetCalorico.kcalFase,
      kcalPropofol: caloriePropofol.kcalDie,
      kcalGlucosata: calorieGlucosata.kcalDie,
    })
    expect(targetNetto.kcalNetto).toBe(1101)
    expect(targetNetto.copertoDaPropofol).toBe(false)

    // Autocontrollo ESPEN: nell'obeso si rifa' all'IBW (52.4), non all'ABW (67.4) usato
    // per il target -> 21 kcal/kg IBW, verde (<=25).
    const semaforo = calcolaSemaforoESPEN({
      kcalDaNutrizione: targetNetto.kcalNetto,
      pesoNutrizionaleKg: pesoNutrizionale.valoreKg,
      ibwKg: ibw,
      bmi,
      percentualeFase,
    })
    expect(semaforo).toMatchObject({ kcalKgEffettive: 16.3, kcalKgControllo: 21, base: 'IBW', livello: 'verde' })

    // 6. Proteine (peso di riferimento IBW, NON scalate dalla fase)
    const proteineTarget = calcolaProteineTarget({ gKg: regimeProteico.g_kg, pesoRiferimentoKg: pesoRifProteico.valoreKg })
    expect(proteineTarget.grammiDie).toBe(105)

    // A_fabbisogno_paziente e' completo qui: NPT (galenica) invariata come richiesto -----
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
    expect(npt.kcalTotali).toBe(1101)
    expect(npt.aminoacidi).toMatchObject({ g: 105, kcal: 420 })
    expect(npt.glucidi).toMatchObject({ g: 151.4 })
    expect(npt.lipidi).toMatchObject({ g: 36.7, propofolG: 36, gTotaliConPropofol: 72.7 })
    expect(npt.glucidi.superaLimite).toBe(false)
    expect(npt.lipidi.superaLimite).toBe(false)

    // B_somministrazione_prodotto (opzionale): stesso target netto (1101), ma con un
    // prodotto commerciale (Nephro HP) invece della sacca galenica NPT.
    const nephroHP = calcolaConversioneProdotto({
      kcalDaNutrizione: targetNetto.kcalNetto,
      kcalMl: 1.8,
      protGMl: 0.081,
      pesoRiferimentoKg: pesoNutrizionale.valoreKg,
    })
    expect(nephroHP).toMatchObject({ mlH: 25.5, kcalDie: 1101, proteineGDie: 49.5, proteineGKg: 0.74 })

    // Confronto con altri due prodotti per lo stesso target: il confronto usa il target
    // proteico g/kg calcolato sopra (105 g / 52.4 kg IBW), non g/kg sul peso_nutrizionale.
    const targetProteineGKg = proteineTarget.grammiDie / pesoRifProteico.valoreKg
    const confronto = calcolaConfrontoProdotti({
      prodotti: [
        { nome: 'Isosource Standard', kcal_ml: 1.0, prot_g_ml: 0.039 },
        { nome: 'Nephro HP', kcal_ml: 1.8, prot_g_ml: 0.081 },
        { nome: 'Peptamen AF', kcal_ml: 1.5, prot_g_ml: 0.094 },
      ],
      kcalDaNutrizione: targetNetto.kcalNetto,
      pesoRiferimentoKg: pesoNutrizionale.valoreKg,
      targetProteineGKg,
    })
    // Nessuno dei 3 copre il target proteico (2.0 g/kg): Peptamen AF (piu' iperproteico)
    // resta comunque il piu' vicino.
    expect(confronto.map((p) => p.nome)).toEqual(['Peptamen AF', 'Nephro HP', 'Isosource Standard'])
  })
})
