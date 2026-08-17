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

// --- Passo 1: regime da BMI (calorico e proteico) --------------------------------------

/** Regime calorico da BMI (fabbisogno_calorico.regime_per_bmi): <30 normocalorico, 30-50 e
 * >50 ipocalorico-iperproteico (soglie diverse da quelle del regime proteico sotto). */
export function selezionaRegimeCalorico(regimePerBmi, bmi) {
  if (bmi === null || bmi === undefined || !(bmi >= 0)) return null
  let chiave
  if (bmi < 30) chiave = 'non_obeso_BMI<30'
  else if (bmi <= 50) chiave = 'obeso_BMI_30-50'
  else chiave = 'obeso_BMI>50'
  const regime = regimePerBmi[chiave]
  return regime ? { chiave, ...regime } : null
}

/** Regime proteico da BMI (proteine.regime_per_bmi): soglie 30/40, DIVERSE da quelle del
 * regime calorico sopra (es. BMI 35 e' "30-50" per le calorie ma "30-40" per le proteine). */
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
 * Peso di riferimento indicato dal regime (campo "peso": "reale"|"IBW"). A differenza della
 * pediatria (dove IBW e' sempre vietato, vedi pesoResolver.js), qui il paziente e' adulto:
 * IBW e' un riferimento legittimo per il regime obeso, quando il JSON lo richiede.
 */
export function pesoDiRiferimento(regime, { pesoKg, ibw }) {
  if (!regime) return { chiave: null, valoreKg: null }
  if (regime.peso === 'IBW') {
    return { chiave: 'IBW', valoreKg: ibw ?? null }
  }
  return { chiave: 'reale', valoreKg: pesoKg ?? null }
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

  const formulaTarget =
    `(${kcalKgRange[0]}-${kcalKgRange[1]} kcal/kg, media ${formatNumero(kcalKgMedio, 1)}) × ` +
    `${formatNumero(pesoRiferimentoKg, decimali)} kg = ${formatNumero(kcalTarget, decimali)} kcal/die`
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

/** kcal_da_nutrizione = kcal_fase - kcal_propofol (mai negativo: se il propofol da solo
 * copre o supera il target di fase, il netto e' 0 e viene segnalato). */
export function calcolaTargetNetto({ kcalFase, kcalPropofol = 0 }, { decimali = 0 } = {}) {
  if (!(kcalFase >= 0)) {
    throw new Error('calcolaTargetNetto: target di fase mancante o non valido')
  }

  const netto = Math.max(0, kcalFase - kcalPropofol)
  const copertoDaPropofol = kcalPropofol >= kcalFase && kcalPropofol > 0
  const formula = `${formatNumero(kcalFase, decimali)} kcal/die - ${formatNumero(kcalPropofol, decimali)} kcal/die (propofol) = ${formatNumero(netto, decimali)} kcal/die`

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
