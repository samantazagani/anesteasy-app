// Motore condiviso per il Modulo 5 (Nutrizione), letto da data/nutrizione.json.

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

/**
 * Calcolatore NPT: aminoacidi da g/kg (indipendente, dalla sezione proteine), glucidi e
 * lipidi come percentuale del target calorico totale (data/nutrizione.json >
 * npt_calcolatore.ripartizione_tipica), convertiti in grammi/die tramite densita_kcal, poi
 * verificati contro i limiti (glucosio in mg/kg/min, lipidi in g/kg/die).
 *
 * @param {{ pesoKg: number, targetKcalKg: number, gKgAminoacidi: number, glucidiPercent: number, lipidiPercent: number, densitaKcal: {glucosio_g:number, lipidi_g:number, aminoacidi_g:number}, limiti: {glucosio_max_mg_kg_min:number, lipidi_max_g_kg_die:number} }} input
 */
export function calcolaNPT(
  { pesoKg, targetKcalKg, gKgAminoacidi, glucidiPercent, lipidiPercent, densitaKcal, limiti },
  { decimali = 1 } = {},
) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaNPT: peso mancante o non valido')
  }
  if (!(targetKcalKg > 0)) {
    throw new Error('calcolaNPT: target kcal/kg mancante o non valido')
  }
  if (!(gKgAminoacidi > 0)) {
    throw new Error('calcolaNPT: g/kg aminoacidi mancante o non valido')
  }
  if (!(glucidiPercent >= 0) || !(lipidiPercent >= 0)) {
    throw new Error('calcolaNPT: percentuali di glucidi/lipidi mancanti o non valide')
  }

  const kcalTotali = targetKcalKg * pesoKg

  const aminoacidiG = gKgAminoacidi * pesoKg
  const aminoacidiKcal = aminoacidiG * densitaKcal.aminoacidi_g
  const formulaAminoacidi =
    `${formatNumero(gKgAminoacidi, 2)} g/kg × ${formatNumero(pesoKg, decimali)} kg = ${formatNumero(aminoacidiG, decimali)} g` +
    ` × ${densitaKcal.aminoacidi_g} kcal/g = ${formatNumero(aminoacidiKcal, decimali)} kcal`

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

  const lipidiGKgDie = lipidiG / pesoKg
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
