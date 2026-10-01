import { calcABW } from './anthropometrics'

// Motore condiviso per il Modulo 5 (Nutrizione), letto da data/nutrizione.json.
// Il flusso e' quello descritto in data/nutrizione.json > calcolatore_target.passi:
// 1. BMI -> regime (calorico e proteico, soglie DIVERSE tra loro)
// 2. kcal_target = kcal_kg(regime) * peso_di_riferimento (reale o IBW secondo il regime)
// 3. kcal_fase = kcal_target * percentuale_fase
// 4. kcal_propofol = ml_h_propofol * 24 * 1.1 (kcal/ml)
// 5. kcal_da_nutrizione = kcal_fase - kcal_propofol
// 6. proteine_target_g = g_kg(regime proteico) * peso_di_riferimento (NON scalato dalla fase)
// Le soglie di BMI dei regimi non sono scritte in forma numerica nel JSON (le chiavi sono
// etichette testuali, es. "obeso_BMI_30-50"): vengono esplicitate qui in codice, sullo
// stesso principio di categoriaEta.js/pediatriaCalculator.js. I VALORI clinici (kcal/kg,
// g/kg, percentuali...) restano sempre letti dal JSON.

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

function formatNumero(valore, decimali) {
  return String(round(valore, decimali))
}

/**
 * Harris-Benedict: dispendio energetico basale per sesso, con fattore di stress come
 * input libero dell'utente (data/nutrizione.json indica solo il range 1.2-1.5 come
 * riferimento, non lo deriva automaticamente dalla gravita).
 *
 * @param {{ sesso: 'M'|'F', pesoKg: number, altezzaCm: number, eta: number, fattoreStress?: number }} input
 */
export function calcolaHarrisBenedict(
  { sesso, pesoKg, altezzaCm, eta, fattoreStress },
  { decimali = 0 } = {},
) {
  if (sesso !== 'M' && sesso !== 'F') {
    throw new Error('calcolaHarrisBenedict: sesso mancante o non valido (M/F)')
  }
  if (!(pesoKg > 0)) {
    throw new Error('calcolaHarrisBenedict: peso mancante o non valido')
  }
  if (!(altezzaCm > 0)) {
    throw new Error('calcolaHarrisBenedict: altezza mancante o non valida')
  }
  if (!(eta >= 0)) {
    throw new Error('calcolaHarrisBenedict: eta mancante o non valida')
  }

  const basale =
    sesso === 'M'
      ? 66.5 + 13.75 * pesoKg + 5.003 * altezzaCm - 6.75 * eta
      : 655.1 + 9.563 * pesoKg + 1.85 * altezzaCm - 4.676 * eta

  const formulaBasale =
    sesso === 'M'
      ? `66.5 + (13.75×${formatNumero(pesoKg, 1)}) + (5.003×${formatNumero(altezzaCm, 1)}) - (6.75×${formatNumero(eta, 1)}) = ${formatNumero(basale, decimali)} kcal`
      : `655.1 + (9.563×${formatNumero(pesoKg, 1)}) + (1.850×${formatNumero(altezzaCm, 1)}) - (4.676×${formatNumero(eta, 1)}) = ${formatNumero(basale, decimali)} kcal`

  let kcalConStress = null
  let formulaStress = null
  if (fattoreStress > 0) {
    kcalConStress = basale * fattoreStress
    formulaStress = `${formatNumero(basale, decimali)} × ${formatNumero(fattoreStress, 2)} = ${formatNumero(kcalConStress, decimali)} kcal`
  }

  return {
    basaleKcal: round(basale, decimali),
    formulaBasale,
    kcalConStress: kcalConStress === null ? null : round(kcalConStress, decimali),
    formulaStress,
  }
}

// --- Peso nutrizionale (rework: sostituisce il regime-calorico-per-BMI) -----------------
//
// Prima il REGIME calorico stesso veniva scelto dal BMI (3 fasce di kcal/kg diverse, con
// peso reale o IBW secondo la fascia). Ora il target calorico e' un range fisso
// (fabbisogno_calorico.kcal_kg, 25-30 kcal/kg per chiunque): a cambiare col BMI e' solo il
// PESO su cui si applica quel range (data/nutrizione.json > peso_nutrizionale.regola):
// BMI<18.5 -> reale, 18.5-30 -> IBW, >30 -> ABW (peso aggiustato, meno aggressivo del solo
// IBW). Stesso principio del guard pediatrico di pesoResolver.js: IBW/ABW sono formule per
// adulti (Devine/ABW sotto ~152cm non hanno senso clinico), quindi su un paziente
// pediatrico questa funzione ricade sempre sul peso reale.

/**
 * @param {{ pesoKg: number, ibw: number|null, bmi: number|null, categoria?: 'pediatrico'|'adulto'|'anziano'|null }} input
 * @returns {{ chiave: 'reale'|'IBW'|'ABW', valoreKg: number|null, bmiUsato: number|null, formula?: string, pesoPediatricoEscluso?: 'IBW'|'ABW' }}
 */
export function calcolaPesoNutrizionale({ pesoKg, ibw, bmi, categoria }, { decimali = 1 } = {}) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaPesoNutrizionale: peso mancante o non valido')
  }
  if (bmi === null || bmi === undefined || !(bmi >= 0)) {
    return { chiave: 'reale', valoreKg: pesoKg, bmiUsato: null }
  }

  let chiave
  if (bmi < 18.5) chiave = 'reale'
  else if (bmi <= 30) chiave = 'IBW'
  else chiave = 'ABW'

  const bmiUsato = round(bmi, decimali)

  if (categoria === 'pediatrico' && chiave !== 'reale') {
    return { chiave: 'reale', valoreKg: pesoKg, bmiUsato, pesoPediatricoEscluso: chiave }
  }

  if (chiave === 'reale') {
    return { chiave, valoreKg: pesoKg, bmiUsato }
  }
  if (!(ibw > 0)) {
    return { chiave, valoreKg: null, bmiUsato }
  }
  if (chiave === 'IBW') {
    return { chiave, valoreKg: round(ibw, decimali), bmiUsato }
  }

  // calcABW (Blocco P, anthropometrics.js): stessa formula gia' condivisa dal profilo
  // paziente, non piu' duplicata qui.
  const abw = calcABW(pesoKg, ibw)
  const formula = `${formatNumero(ibw, decimali)} + 0.4×(${formatNumero(pesoKg, decimali)}-${formatNumero(ibw, decimali)}) = ${formatNumero(abw, decimali)} kg`
  return { chiave: 'ABW', valoreKg: round(abw, decimali), bmiUsato, formula }
}

// --- Regime proteico da BMI (invariato nelle soglie) ------------------------------------

/** Regime proteico da BMI (proteine.regime_per_bmi): soglie 30/40. Il campo "peso" del
 * bracket non-obeso ora vale "peso_nutrizionale" (era "reale"): vedi pesoDiRiferimento. */
export function selezionaRegimeProteico(regimePerBmi, bmi) {
  if (bmi === null || bmi === undefined || !(bmi >= 0)) return null
  let chiave
  if (bmi < 30) chiave = 'non_obeso'
  else if (bmi < 40) chiave = 'obeso_BMI_30-40'
  else chiave = 'obeso_BMI>=40'
  const regime = regimePerBmi[chiave]
  return regime ? { chiave, ...regime } : null
}

/**
 * Peso di riferimento indicato da un regime/bracket (campo "peso": "reale"|"IBW"|
 * "peso_nutrizionale"). "IBW" resta un valore fisso ed esplicito (i bracket obesi delle
 * proteine lo richiedono sempre, anche quando peso_nutrizionale sceglierebbe ABW: per il
 * dosaggio proteico ASPEN raccomanda IBW, non ABW, nell'obeso). "peso_nutrizionale" usa il
 * risultato gia' calcolato da calcolaPesoNutrizionale.
 */
export function pesoDiRiferimento(regime, { pesoKg, ibw, pesoNutrizionale }) {
  if (!regime) return { chiave: null, valoreKg: null }
  if (regime.peso === 'IBW') {
    return { chiave: 'IBW', valoreKg: ibw ?? null }
  }
  if (regime.peso === 'peso_nutrizionale') {
    return pesoNutrizionale
      ? { chiave: pesoNutrizionale.chiave, valoreKg: pesoNutrizionale.valoreKg }
      : { chiave: null, valoreKg: null }
  }
  return { chiave: 'reale', valoreKg: pesoKg ?? null }
}

/**
 * Guardrail ESPEN (semaforo verde/giallo/rosso) sulle kcal/kg EFFETTIVE della nutrizione
 * (dopo fase e sottrazioni), come da data/nutrizione.json > calcolatore_target >
 * A_fabbisogno_paziente.controllo_espen: nell'obeso il controllo si rifa' all'IBW (non
 * all'ABW usato per calcolare il target: l'ABW rende il target gia' ipocalorico "a vista",
 * l'IBW e' il denominatore di sicurezza che lo verifica). Il JSON definisce solo verde/
 * rosso: la fascia "giallo" e' un'interpolazione ragionevole di margine, non una soglia
 * ESPEN pubblicata.
 */
export function calcolaSemaforoESPEN(
  { kcalDaNutrizione, pesoNutrizionaleKg, ibwKg, bmi, faseAcutaPrecoce = false, percentualeFase },
  { decimali = 1 } = {},
) {
  if (!(kcalDaNutrizione >= 0) || !(pesoNutrizionaleKg > 0)) {
    throw new Error('calcolaSemaforoESPEN: kcal da nutrizione o peso di riferimento mancanti')
  }

  const kcalKgEffettive = kcalDaNutrizione / pesoNutrizionaleKg
  const obeso = bmi > 30

  let base = 'peso_nutrizionale'
  let kcalKgControllo = kcalKgEffettive
  if (obeso) {
    base = 'IBW'
    if (!(ibwKg > 0)) {
      return { kcalKgEffettive: round(kcalKgEffettive, decimali), kcalKgControllo: null, base, livello: null }
    }
    kcalKgControllo = kcalDaNutrizione / ibwKg
  }

  let livello
  if (obeso) {
    if (kcalKgControllo <= 25) livello = 'verde'
    else if (kcalKgControllo <= 30) livello = 'giallo'
    else livello = 'rosso'
  } else if (kcalKgControllo >= 20 && kcalKgControllo <= 30) {
    livello = 'verde'
  } else if ((kcalKgControllo > 30 && kcalKgControllo <= 35) || (kcalKgControllo < 20 && kcalKgControllo >= 15)) {
    livello = 'giallo'
  } else {
    livello = 'rosso'
  }

  const superaLimiteFaseAcuta = faseAcutaPrecoce && percentualeFase > 70
  if (superaLimiteFaseAcuta) {
    if (livello === 'verde') livello = 'giallo'
    else if (livello === 'giallo') livello = 'rosso'
  }

  return {
    kcalKgEffettive: round(kcalKgEffettive, decimali),
    kcalKgControllo: round(kcalKgControllo, decimali),
    base,
    livello,
    superaLimiteFaseAcuta,
  }
}

// --- Passo 2-3: target calorico e target di fase ----------------------------------------

/**
 * Estrae un valore percentuale plausibile dal testo libero di una fase (es. "<=70%",
 * "80-100%", "100% (o piu se catabolismo)"): un solo numero -> quel numero; due numeri ->
 * la media. Serve SOLO a precompilare il campo, che resta sempre modificabile dall'utente.
 */
export function percentualeFaseDefault(testo) {
  if (typeof testo !== 'string') return null
  const numeri = (testo.match(/\d+(\.\d+)?/g) ?? []).map(Number)
  if (numeri.length === 0) return null
  if (numeri.length === 1) return numeri[0]
  return round((numeri[0] + numeri[1]) / 2, 1)
}

/** kcal_target = media(kcal_kg) × peso_di_riferimento ; kcal_fase = kcal_target × percentuale. */
export function calcolaTargetCalorico({ kcalKgRange, pesoRiferimentoKg, percentualeFase }, { decimali = 0 } = {}) {
  if (!(pesoRiferimentoKg > 0)) {
    throw new Error('calcolaTargetCalorico: peso di riferimento mancante o non valido')
  }
  if (!(percentualeFase > 0)) {
    throw new Error('calcolaTargetCalorico: percentuale di fase mancante o non valida')
  }

  const kcalKgMedio = (kcalKgRange[0] + kcalKgRange[1]) / 2
  const kcalTarget = kcalKgMedio * pesoRiferimentoKg
  const kcalFase = kcalTarget * (percentualeFase / 100)

  // Il peso si mostra sempre con 1 decimale (non "decimali", che e' la precisione delle
  // kcal): con peso_nutrizionale spesso frazionario (IBW/ABW, es. 67.4 kg) arrotondarlo a
  // 0 decimali nasconderebbe il numero effettivamente usato nel calcolo.
  const formulaTarget =
    `(${kcalKgRange[0]}-${kcalKgRange[1]} kcal/kg, media ${formatNumero(kcalKgMedio, 1)}) × ` +
    `${formatNumero(pesoRiferimentoKg, 1)} kg = ${formatNumero(kcalTarget, decimali)} kcal/die`
  const formulaFase = `${formatNumero(kcalTarget, decimali)} kcal/die × ${formatNumero(percentualeFase, 0)}% = ${formatNumero(kcalFase, decimali)} kcal/die`

  return {
    kcalKgMedio: round(kcalKgMedio, 2),
    kcalTarget: round(kcalTarget, decimali),
    kcalFase: round(kcalFase, decimali),
    formulaTarget,
    formulaFase,
  }
}

// --- Passo 4-5: calorie/lipidi del propofol e target netto -----------------------------

/** kcal/die e g lipidi/die apportati dal propofol in corso (emulsione lipidica 10%): da
 * sottrarre al fabbisogno da somministrare (propofol_calorie). */
export function calcolaCaloriePropofol({ mlH, kcalPerMl, lipidiGPerMl }, { decimali = 0 } = {}) {
  if (!(mlH > 0)) {
    throw new Error('calcolaCaloriePropofol: ml/h mancante o non valido')
  }
  if (!(kcalPerMl > 0) || !(lipidiGPerMl > 0)) {
    throw new Error('calcolaCaloriePropofol: kcal/ml o lipidi g/ml mancanti nel JSON')
  }

  const kcalDie = mlH * 24 * kcalPerMl
  const lipidiGDie = mlH * 24 * lipidiGPerMl
  const formulaKcal = `${formatNumero(mlH, 1)} ml/h × 24 × ${kcalPerMl} kcal/ml = ${formatNumero(kcalDie, decimali)} kcal/die`
  const formulaLipidi = `${formatNumero(mlH, 1)} ml/h × 24 × ${lipidiGPerMl} g/ml = ${formatNumero(lipidiGDie, 2)} g/die`

  return {
    kcalDie: round(kcalDie, decimali),
    lipidiGDie: round(lipidiGDie, 2),
    formulaKcal,
    formulaLipidi,
  }
}

/** kcal_da_nutrizione = kcal_fase - kcal_propofol - kcal_glucosata (mai negativo: se le
 * infusioni da sole coprono o superano il target di fase, il netto e' 0 e viene segnalato).
 * kcalGlucosata e' opzionale (rework: prima si sottraeva solo il propofol) — con 0/assente
 * la formula resta identica a prima. */
export function calcolaTargetNetto({ kcalFase, kcalPropofol = 0, kcalGlucosata = 0 }, { decimali = 0 } = {}) {
  if (!(kcalFase >= 0)) {
    throw new Error('calcolaTargetNetto: target di fase mancante o non valido')
  }

  const kcalSottratte = kcalPropofol + kcalGlucosata
  const netto = Math.max(0, kcalFase - kcalSottratte)
  const copertoDaPropofol = kcalSottratte >= kcalFase && kcalSottratte > 0
  const formula =
    kcalGlucosata > 0
      ? `${formatNumero(kcalFase, decimali)} kcal/die - ${formatNumero(kcalPropofol, decimali)} kcal/die (propofol) - ${formatNumero(kcalGlucosata, decimali)} kcal/die (glucosata) = ${formatNumero(netto, decimali)} kcal/die`
      : `${formatNumero(kcalFase, decimali)} kcal/die - ${formatNumero(kcalPropofol, decimali)} kcal/die (propofol) = ${formatNumero(netto, decimali)} kcal/die`

  return { kcalNetto: round(netto, decimali), copertoDaPropofol, formula }
}

// --- Passo 6: target proteico (indipendente dalla fase) ---------------------------------

/** proteine_target_g = g_kg(regime) × peso_di_riferimento. NON si applica la percentuale di
 * fase: le proteine non si riducono con la fase quanto le calorie (nota esplicita nel
 * JSON, calcolatore_target.passi[5]). */
export function calcolaProteineTarget({ gKg, pesoRiferimentoKg }, { decimali = 0 } = {}) {
  if (!(gKg > 0)) {
    throw new Error('calcolaProteineTarget: g/kg mancante o non valido')
  }
  if (!(pesoRiferimentoKg > 0)) {
    throw new Error('calcolaProteineTarget: peso di riferimento mancante o non valido')
  }

  const grammi = gKg * pesoRiferimentoKg
  const formula = `${formatNumero(gKg, 2)} g/kg × ${formatNumero(pesoRiferimentoKg, decimali)} kg = ${formatNumero(grammi, decimali)} g/die`

  return { grammiDie: round(grammi, decimali), formula }
}

/**
 * Calcolatore NPT: riceve il target calorico gia' risolto (kcalTotaliTarget: netto
 * post-fase e post-propofol, non piu' una semplice kcal/kg × peso) e i grammi di
 * aminoacidi gia' risolti (aminoacidiG: g/kg del regime proteico × il SUO peso di
 * riferimento, che puo' differire da quello usato per le calorie). glucidi e lipidi restano
 * percentuali del target totale, come prima. lipidiPropofolG (g/die gia' apportati dal
 * propofol) si somma ai lipidi della NPT prima di verificare il limite g/kg/die: il tetto
 * di sicurezza riguarda i lipidi totali ricevuti dal paziente, non solo quelli della sacca.
 * pesoKg qui e' sempre il peso REALE (per i limiti mg/kg/min e g/kg/die), indipendentemente
 * dal peso di riferimento (reale o IBW) usato a monte per calorie/proteine.
 */
export function calcolaNPT(
  { pesoKg, kcalTotaliTarget, aminoacidiG, glucidiPercent, lipidiPercent, densitaKcal, limiti, lipidiPropofolG = 0 },
  { decimali = 1 } = {},
) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaNPT: peso mancante o non valido')
  }
  if (!(kcalTotaliTarget > 0)) {
    throw new Error('calcolaNPT: target calorico mancante o non valido')
  }
  if (!(aminoacidiG > 0)) {
    throw new Error('calcolaNPT: grammi di aminoacidi mancanti o non validi')
  }
  if (!(glucidiPercent >= 0) || !(lipidiPercent >= 0)) {
    throw new Error('calcolaNPT: percentuali di glucidi/lipidi mancanti o non valide')
  }

  const kcalTotali = kcalTotaliTarget

  const aminoacidiKcal = aminoacidiG * densitaKcal.aminoacidi_g
  const formulaAminoacidi = `${formatNumero(aminoacidiG, decimali)} g × ${densitaKcal.aminoacidi_g} kcal/g = ${formatNumero(aminoacidiKcal, decimali)} kcal`

  const glucidiKcal = (kcalTotali * glucidiPercent) / 100
  const glucidiG = glucidiKcal / densitaKcal.glucosio_g
  const formulaGlucidi =
    `${formatNumero(kcalTotali, decimali)} kcal × ${formatNumero(glucidiPercent, 1)}% = ${formatNumero(glucidiKcal, decimali)} kcal` +
    ` ÷ ${densitaKcal.glucosio_g} kcal/g = ${formatNumero(glucidiG, decimali)} g`

  const lipidiKcal = (kcalTotali * lipidiPercent) / 100
  const lipidiG = lipidiKcal / densitaKcal.lipidi_g
  const formulaLipidi =
    `${formatNumero(kcalTotali, decimali)} kcal × ${formatNumero(lipidiPercent, 1)}% = ${formatNumero(lipidiKcal, decimali)} kcal` +
    ` ÷ ${densitaKcal.lipidi_g} kcal/g = ${formatNumero(lipidiG, decimali)} g`

  const glucosioMgKgMin = (glucidiG * 1000) / (1440 * pesoKg)
  const superaLimiteGlucosio = glucosioMgKgMin > limiti.glucosio_max_mg_kg_min

  const lipidiTotaliG = lipidiG + lipidiPropofolG
  const lipidiGKgDie = lipidiTotaliG / pesoKg
  const superaLimiteLipidi = lipidiGKgDie > limiti.lipidi_max_g_kg_die

  return {
    kcalTotali: round(kcalTotali, decimali),
    aminoacidi: {
      g: round(aminoacidiG, decimali),
      kcal: round(aminoacidiKcal, decimali),
      formula: formulaAminoacidi,
    },
    glucidi: {
      g: round(glucidiG, decimali),
      kcal: round(glucidiKcal, decimali),
      formula: formulaGlucidi,
      mgKgMin: round(glucosioMgKgMin, 2),
      superaLimite: superaLimiteGlucosio,
    },
    lipidi: {
      g: round(lipidiG, decimali),
      kcal: round(lipidiKcal, decimali),
      formula: formulaLipidi,
      propofolG: round(lipidiPropofolG, decimali),
      gTotaliConPropofol: round(lipidiTotaliG, decimali),
      gKgDie: round(lipidiGKgDie, 2),
      superaLimite: superaLimiteLipidi,
    },
  }
}

/**
 * Volume (ml) di un componente NPT dati i grammi/die e una concentrazione libera della
 * soluzione commerciale (in g/100ml, es. glucosata 33% = 33 g/100ml), con lo stesso
 * schema del calcolatore diluizione del Modulo 2: il JSON non fornisce concentrazioni
 * standard, l'utente inserisce quella della soluzione che sta usando.
 */
export function calcolaVolumeComponente(grammi, concentrazionePercento, { decimali = 0 } = {}) {
  if (!(grammi >= 0)) {
    throw new Error('calcolaVolumeComponente: grammi mancanti o non validi')
  }
  if (!(concentrazionePercento > 0)) {
    throw new Error('calcolaVolumeComponente: concentrazione mancante o non valida')
  }

  const volumeMl = (grammi * 100) / concentrazionePercento
  const formula = `${formatNumero(grammi, 1)} g ÷ (${formatNumero(concentrazionePercento, 1)} g/100ml) = ${formatNumero(volumeMl, decimali)} ml`

  return { volumeMl: round(volumeMl, decimali), formula }
}

/** Criterio di rischio refeeding "BMI <16": confronto automatico col BMI del profilo. */
export function criterioBMIRefeeding(bmi) {
  return bmi !== null && bmi !== undefined && bmi < 16
}

// --- Calorie da glucosata (stesso pattern di calcolaCaloriePropofol) --------------------

/** kcal/die apportate da un'infusione di glucosata in corso, da sottrarre al fabbisogno
 * come il propofol (data/nutrizione.json > glucosata_calorie). */
export function calcolaCaloriaGlucosata({ mlH, concentrazionePercento, kcalPerGGlucosio = 3.4 }, { decimali = 0 } = {}) {
  if (!(mlH > 0)) {
    throw new Error('calcolaCaloriaGlucosata: ml/h mancante o non valido')
  }
  if (!(concentrazionePercento > 0)) {
    throw new Error('calcolaCaloriaGlucosata: concentrazione mancante o non valida')
  }

  const kcalDie = mlH * 24 * (concentrazionePercento / 100) * kcalPerGGlucosio
  const formula =
    `${formatNumero(mlH, 1)} ml/h × 24 × (${formatNumero(concentrazionePercento, 1)}/100) × ${kcalPerGGlucosio} = ` +
    `${formatNumero(kcalDie, decimali)} kcal/die`

  return { kcalDie: round(kcalDie, decimali), formula }
}

// --- Bilancio azotato --------------------------------------------------------------------

/** Bilancio azotato (g N/24h) = azoto introdotto (proteine/6.25) - azoto eliminato
 * (UUN + 4 g perdite insensibili/non ureiche). Positivo = anabolismo, negativo = catabolismo. */
export function calcolaBilancioAzotato({ proteineGDie, uunGDie }, { decimali = 1 } = {}) {
  if (!(proteineGDie >= 0)) {
    throw new Error('calcolaBilancioAzotato: proteine g/die mancanti o non valide')
  }
  if (!(uunGDie >= 0)) {
    throw new Error('calcolaBilancioAzotato: azoturia (UUN) mancante o non valida')
  }

  const azotoIntrodottoG = proteineGDie / 6.25
  const azotoEliminatoG = uunGDie + 4
  const bilancioG = azotoIntrodottoG - azotoEliminatoG
  const formula =
    `(${formatNumero(proteineGDie, decimali)} ÷ 6.25 = ${formatNumero(azotoIntrodottoG, decimali)} g) - ` +
    `(${formatNumero(uunGDie, decimali)} + 4 = ${formatNumero(azotoEliminatoG, decimali)} g) = ${formatNumero(bilancioG, decimali)} g N/24h`

  return {
    azotoIntrodottoG: round(azotoIntrodottoG, decimali),
    azotoEliminatoG: round(azotoEliminatoG, decimali),
    bilancioG: round(bilancioG, decimali),
    catabolico: bilancioG < 0,
    formula,
  }
}

// --- B) Somministrazione con prodotto commerciale (opzionale) --------------------------
//
// A differenza di A_fabbisogno_paziente (sempre calcolato), questa parte si usa solo se si
// somministra un prodotto commerciale invece di una sacca galenica personalizzata
// (data/nutrizione.json > calcolatore_target.B_somministrazione_prodotto).

/** ml/h di un prodotto (enterale o parenterale) per erogare il target calorico netto, e gli
 * apporti effettivi che ne derivano (kcal/die, proteine g/die e g/kg). */
export function calcolaConversioneProdotto({ kcalDaNutrizione, kcalMl, protGMl, pesoRiferimentoKg }, { decimali = 1 } = {}) {
  if (!(kcalDaNutrizione > 0)) {
    throw new Error('calcolaConversioneProdotto: target calorico netto mancante o non valido')
  }
  if (!(kcalMl > 0)) {
    throw new Error('calcolaConversioneProdotto: kcal/ml del prodotto mancante o non valida')
  }

  const mlH = kcalDaNutrizione / (kcalMl * 24)
  const kcalDieEffettive = mlH * 24 * kcalMl
  const proteineGDie = mlH * 24 * (protGMl ?? 0)
  const proteineGKg = pesoRiferimentoKg > 0 ? proteineGDie / pesoRiferimentoKg : null
  const formula = `${formatNumero(kcalDaNutrizione, 0)} kcal/die ÷ (${kcalMl} kcal/ml × 24) = ${formatNumero(mlH, decimali)} ml/h`

  return {
    mlH: round(mlH, decimali),
    kcalDie: round(kcalDieEffettive, 0),
    proteineGDie: round(proteineGDie, 1),
    proteineGKg: proteineGKg === null ? null : round(proteineGKg, 2),
    formula,
  }
}

/**
 * Confronto affiancato tra piu' prodotti per lo stesso target calorico (come NutriCalc):
 * a parita' di kcal, prodotti diversi danno proteine diverse (rapporto prot/kcal variabile).
 * Ordinato per vicinanza al target proteico (g/kg), non per nome o kcal/ml.
 */
export function calcolaConfrontoProdotti({ prodotti, kcalDaNutrizione, pesoRiferimentoKg, targetProteineGKg }) {
  if (!Array.isArray(prodotti) || prodotti.length === 0) {
    throw new Error('calcolaConfrontoProdotti: elenco prodotti mancante o vuoto')
  }

  const righe = prodotti.map((p) => {
    const conversione = calcolaConversioneProdotto({
      kcalDaNutrizione,
      kcalMl: p.kcal_ml,
      protGMl: p.prot_g_ml,
      pesoRiferimentoKg,
    })
    const distanzaTargetGKg =
      targetProteineGKg > 0 && conversione.proteineGKg !== null
        ? round(Math.abs(conversione.proteineGKg - targetProteineGKg), 2)
        : null
    return { nome: p.nome, ...conversione, distanzaTargetGKg }
  })

  righe.sort((a, b) => {
    if (a.distanzaTargetGKg === null && b.distanzaTargetGKg === null) return 0
    if (a.distanzaTargetGKg === null) return 1
    if (b.distanzaTargetGKg === null) return -1
    return a.distanzaTargetGKg - b.distanzaTargetGKg
  })

  return righe
}
