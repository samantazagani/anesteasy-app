// Motore condiviso per il Modulo 3 (Pediatria), letto da data/pediatria-presidi.json.
// Le soglie di fascia (mesi/anni) usate per il lookup non sono scritte nel JSON in forma
// numerica (le fasce sono etichette testuali, es. "1-6 mesi"), quindi vengono esplicitate
// qui in codice, sullo stesso principio di categoriaEta.js. I VALORI clinici (diametri,
// dosi, parametri) restano sempre letti dal JSON, mai ridefiniti in questo file.

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

function formatNumero(valore, decimali) {
  return String(round(valore, decimali))
}

// --- Tubo IOT: tabella (<=2 anni) vs formule (>2 anni) --------------------------------

/**
 * @param {Array<object>} tabellaEta presidi.tubo_iot.tabella_eta
 * @param {number} etaAnni
 * @returns {object|null} riga della tabella, o null se l'eta' non e' nota o supera i 2 anni
 * (in quel caso vanno usate le formule, vedi calcolaTuboIOTFormula). Non seleziona mai
 * automaticamente "prematuro": la prematurita' non e' derivabile dall'eta anagrafica.
 */
export function trovaFasciaTuboIOT(tabellaEta, etaAnni) {
  if (!(etaAnni >= 0) || etaAnni > 2) return null

  const mesi = etaAnni * 12
  let chiave
  if (mesi <= 1) chiave = 'neonato a termine'
  else if (mesi <= 6) chiave = '1-6 mesi'
  else if (mesi <= 12) chiave = '6-12 mesi'
  else chiave = '1-2 anni'

  return tabellaEta.find((r) => r.fascia === chiave) ?? null
}

/**
 * Formule tubo IOT (valide >2 anni, per PROGETTO/dati "formule valide >1-2 anni").
 * La profondita' orale/nasale qui e' la stima INIZIALE dall'eta (prima di scegliere un
 * diametro commerciale): una volta scelto il diametro tra i due proposti da
 * calcolaDiametriDisponibili, va ricalcolata con calcolaProfonditaDaDiametro (piu'
 * accurata, dipende dal tubo realmente usato).
 * @param {number} etaAnni
 */
export function calcolaTuboIOTFormula(etaAnni, { decimali = 1 } = {}) {
  if (!(etaAnni > 0)) {
    throw new Error('calcolaTuboIOTFormula: eta mancante o non valida')
  }

  const nonCuffiato = etaAnni / 4 + 4
  const cuffiato = etaAnni / 4 + 3.5
  const profondita = etaAnni / 2 + 12
  const profonditaNasale = etaAnni / 2 + 15
  const etaTesto = formatNumero(etaAnni, 2)

  return {
    diametroNonCuffiatoMm: round(nonCuffiato, decimali),
    diametroCuffiatoMm: round(cuffiato, decimali),
    // Valori NON arrotondati per il display: da passare a calcolaDiametriDisponibili, che
    // deve lavorare sul valore grezzo esatto (arrotondare qui prima avrebbe potuto far
    // sparire un pareggio esatto tra i due diametri commerciali, es. eta 5 anni cuffiato:
    // 5/4+3.5 = 4.75mm esatto, arrotondato a 1 decimale diventerebbe 4.8mm e perderebbe il
    // pareggio che attiva la preferenza per difetto).
    diametroNonCuffiatoGrezzo: nonCuffiato,
    diametroCuffiatoGrezzo: cuffiato,
    profonditaLabbroCm: round(profondita, decimali),
    profonditaNasaleCm: round(profonditaNasale, decimali),
    formulaNonCuffiato: `${etaTesto}/4 + 4 = ${formatNumero(nonCuffiato, decimali)} mm`,
    formulaCuffiato: `${etaTesto}/4 + 3.5 = ${formatNumero(cuffiato, decimali)} mm`,
    formulaProfondita: `${etaTesto}/2 + 12 = ${formatNumero(profondita, decimali)} cm`,
    formulaProfonditaNasale: `${etaTesto}/2 + 15 = ${formatNumero(profonditaNasale, decimali)} cm`,
  }
}

/**
 * Dati due diametri commerciali che racchiudono un valore grezzo calcolato (incrementi
 * fissi, es. 0.5mm per i tubi IOT), indica quale dei due e' consigliato: il piu' vicino al
 * valore grezzo, tranne nel caso di pareggio esatto (valore a meta' tra i due) per un tubo
 * cuffiato, dove si preferisce il diametro inferiore (il cuff sigilla comunque la via
 * aerea, quindi conviene accettare un minimo di gioco piuttosto che sovradimensionare: meno
 * trauma della mucosa subglottica).
 */
export function calcolaDiametriDisponibili(valoreGrezzo, { incremento = 0.5, cuffiato = false } = {}) {
  if (!(valoreGrezzo > 0)) {
    throw new Error('calcolaDiametriDisponibili: valore grezzo mancante o non valido')
  }
  if (!(incremento > 0)) {
    throw new Error('calcolaDiametriDisponibili: incremento mancante o non valido')
  }

  const passi = valoreGrezzo / incremento
  const inferiore = round(Math.floor(passi + 1e-9) * incremento, 4)
  let superiore = round(Math.ceil(passi - 1e-9) * incremento, 4)
  if (superiore <= inferiore) superiore = round(inferiore + incremento, 4)

  const distInferiore = round(valoreGrezzo - inferiore, 6)
  const distSuperiore = round(superiore - valoreGrezzo, 6)

  let consigliato
  let motivoConsigliato
  if (distInferiore < distSuperiore) {
    consigliato = inferiore
    motivoConsigliato = 'più vicino al valore calcolato'
  } else if (distSuperiore < distInferiore) {
    consigliato = superiore
    motivoConsigliato = 'più vicino al valore calcolato'
  } else {
    consigliato = inferiore
    motivoConsigliato = cuffiato
      ? "a metà tra i due: per il cuffiato si preferisce il difetto (il cuff sigilla comunque, minor trauma mucosa)"
      : 'a metà tra i due: per difetto'
  }

  return {
    grezzo: round(valoreGrezzo, 2),
    inferiore,
    superiore,
    consigliato,
    motivoConsigliato,
  }
}

/** Profondita' del tubo IOT ricalcolata dal diametro EFFETTIVAMENTE scelto (piu' accurata
 * della sola stima per eta): profondita_cm ~= 3 x diametro_interno_mm. */
export function calcolaProfonditaDaDiametro(diametroMm, { decimali = 1 } = {}) {
  if (!(diametroMm > 0)) {
    throw new Error('calcolaProfonditaDaDiametro: diametro mancante o non valido')
  }

  const profondita = 3 * diametroMm
  const formula = `3 × ${formatNumero(diametroMm, 2)} mm = ${formatNumero(profondita, decimali)} cm`

  return { profonditaCm: round(profondita, decimali), formula }
}

// --- Lookup per fascia (eta o peso) -----------------------------------------------------

/** @returns {object|null} riga di parametri_vitali per la fascia d'eta del paziente. */
export function trovaParametriVitali(parametriVitali, etaAnni) {
  const chiave = classificaFasciaParametriVitali(etaAnni)
  return chiave ? (parametriVitali.find((p) => p.fascia === chiave) ?? null) : null
}

function classificaFasciaParametriVitali(etaAnni) {
  if (!(etaAnni >= 0)) return null
  const mesi = etaAnni * 12
  if (mesi <= 1) return 'neonato (0-28 gg)'
  if (etaAnni < 1) return 'lattante (1-12 mesi)'
  if (etaAnni <= 2) return '1-2 anni'
  if (etaAnni <= 5) return '3-5 anni'
  if (etaAnni <= 11) return '6-11 anni'
  return '12-15 anni'
}

/**
 * Lookup generico per fasce definite da un range numerico [min, max] (es. lma_per_peso).
 * Al confine tra due fasce (es. 5 kg per [0,5] e [5,10]) vince la fascia inferiore, per
 * come Array.find restituisce la prima corrispondenza.
 */
export function trovaFasciaPerPeso(fasce, pesoKg) {
  if (!(pesoKg >= 0)) return null
  return fasce.find(({ peso_kg }) => pesoKg >= peso_kg[0] && pesoKg <= peso_kg[1]) ?? null
}

export function trovaLamaLaringoscopio(lama, etaAnni) {
  const chiave = classificaFasciaLama(etaAnni)
  return chiave ? (lama.find((l) => l.fascia === chiave) ?? null) : null
}

function classificaFasciaLama(etaAnni) {
  if (!(etaAnni >= 0)) return null
  const mesi = etaAnni * 12
  if (mesi <= 1) return 'prematuro/neonato'
  if (etaAnni < 1) return 'lattante'
  if (etaAnni <= 5) return '1-5 anni'
  return '>6 anni'
}

export function trovaCvc(cvc, etaAnni) {
  const chiave = classificaFasciaCvc(etaAnni)
  return chiave ? (cvc.find((c) => c.fascia === chiave) ?? null) : null
}

function classificaFasciaCvc(etaAnni) {
  if (!(etaAnni >= 0)) return null
  if (etaAnni < 1) return 'neonato/lattante'
  if (etaAnni <= 6) return 'bambino'
  return '>6 anni'
}

export function trovaCatetereVescicale(catetere, etaAnni) {
  const chiave = classificaFasciaCatetere(etaAnni)
  return chiave ? (catetere.find((c) => c.fascia === chiave) ?? null) : null
}

function classificaFasciaCatetere(etaAnni) {
  if (!(etaAnni >= 0)) return null
  const mesi = etaAnni * 12
  if (mesi <= 1) return 'neonato'
  if (etaAnni < 1) return 'lattante'
  if (etaAnni < 12) return 'bambino'
  return 'adolescente'
}

// --- Stime: peso stimato, volemia, perdita ematica massima -----------------------------

/**
 * Peso stimato dalla fascia d'eta corretta (stime.peso_stimato_kg.formule), con a fianco
 * il valore alternativo APLS per confronto (stime.peso_stimato_kg.alternativa_APLS).
 * @returns {object|null} null se l'eta' e' fuori dal range coperto dalle formule (0-12 anni)
 */
export function calcolaPesoStimato(etaAnni, { decimali = 1 } = {}) {
  if (!(etaAnni >= 0)) return null

  let pesoKg
  let formula
  if (etaAnni < 1) {
    const mesi = round(etaAnni * 12, 1)
    pesoKg = 0.5 * mesi + 4
    formula = `(0.5 × ${formatNumero(mesi, 1)} mesi) + 4 = ${formatNumero(pesoKg, decimali)} kg`
  } else if (etaAnni <= 5) {
    pesoKg = 2 * etaAnni + 8
    formula = `(2 × ${formatNumero(etaAnni, 2)} anni) + 8 = ${formatNumero(pesoKg, decimali)} kg`
  } else if (etaAnni <= 12) {
    pesoKg = 3 * etaAnni + 7
    formula = `(3 × ${formatNumero(etaAnni, 2)} anni) + 7 = ${formatNumero(pesoKg, decimali)} kg`
  } else {
    return null
  }

  const pesoAPLS = (etaAnni + 4) * 2
  const formulaAPLS = `(${formatNumero(etaAnni, 2)} + 4) × 2 = ${formatNumero(pesoAPLS, decimali)} kg`

  return {
    pesoKg: round(pesoKg, decimali),
    formula,
    pesoAPLS: round(pesoAPLS, decimali),
    formulaAPLS,
  }
}

export function trovaVolemia(volemiaFasce, etaAnni) {
  if (!(etaAnni >= 0)) return null
  const mesi = etaAnni * 12
  let chiave
  if (mesi <= 1) chiave = 'neonato'
  else if (etaAnni < 1) chiave = 'lattante'
  else chiave = 'bambino'
  return volemiaFasce.find((f) => f.fascia === chiave) ?? null
}

export function calcolaVolemia(volemiaRow, pesoKg, { decimali = 0 } = {}) {
  if (!volemiaRow || !(pesoKg > 0)) return null
  const [min, max] = volemiaRow.valore
  const volMinMl = min * pesoKg
  const volMaxMl = max * pesoKg
  const formula = `${min}-${max} ml/kg × ${formatNumero(pesoKg, 1)} kg = ${formatNumero(volMinMl, decimali)}-${formatNumero(volMaxMl, decimali)} ml`

  return { volMinMl: round(volMinMl, decimali), volMaxMl: round(volMaxMl, decimali), formula }
}

/**
 * Perdita ematica massima ammissibile: richiede Hct iniziale/minimo come input
 * dell'utente (non fanno parte del profilo paziente).
 */
export function calcolaPerditaEmaticaMax(
  { volemiaRow, pesoKg, hctIniziale, hctMinimo },
  { decimali = 0 } = {},
) {
  if (!volemiaRow || !(pesoKg > 0)) {
    throw new Error('calcolaPerditaEmaticaMax: volemia o peso mancanti')
  }
  if (!(hctIniziale > 0) || !(hctMinimo >= 0) || hctMinimo > hctIniziale) {
    throw new Error('calcolaPerditaEmaticaMax: Hct iniziale/minimo mancanti o non validi')
  }

  const [volMinKg, volMaxKg] = volemiaRow.valore
  const fattore = (hctIniziale - hctMinimo) / hctIniziale
  const perditaMinMl = volMinKg * pesoKg * fattore
  const perditaMaxMl = volMaxKg * pesoKg * fattore
  const formula =
    `${volMinKg}-${volMaxKg} ml/kg × ${formatNumero(pesoKg, 1)} kg × (${hctIniziale}-${hctMinimo})/${hctIniziale}` +
    ` = ${formatNumero(perditaMinMl, decimali)}-${formatNumero(perditaMaxMl, decimali)} ml`

  return { perditaMinMl: round(perditaMinMl, decimali), perditaMaxMl: round(perditaMaxMl, decimali), formula }
}

/**
 * Adatta la forma { valore: [min, max], unita } usata da data/pediatria-presidi.json
 * (bolo_riempimento, ipoglicemia) a { min, max, unita }, la shape attesa da
 * doseCalculator.calcolaDose. Senza questo adattatore dose.valore sarebbe un array e
 * calcolaDose lo moltiplicherebbe per il peso producendo silenziosamente NaN.
 */
export function doseDaIntervallo({ valore, unita }) {
  const [min, max] = valore
  return { min, max, unita }
}

// --- Fluidi ------------------------------------------------------------------------------

/** Mantenimento 4-2-1: 4 ml/kg/h (primi 10 kg) + 2 ml/kg/h (10-20 kg) + 1 ml/kg/h (>20 kg). */
export function calcolaMantenimento421(pesoKg, { decimali = 1 } = {}) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaMantenimento421: peso mancante o non valido')
  }

  const primi10 = Math.min(pesoKg, 10)
  const secondi10 = Math.max(0, Math.min(pesoKg, 20) - 10)
  const oltre20 = Math.max(0, pesoKg - 20)
  const mlH = primi10 * 4 + secondi10 * 2 + oltre20 * 1

  const parti = []
  if (primi10 > 0) parti.push(`4×${formatNumero(primi10, decimali)}`)
  if (secondi10 > 0) parti.push(`2×${formatNumero(secondi10, decimali)}`)
  if (oltre20 > 0) parti.push(`1×${formatNumero(oltre20, decimali)}`)

  return {
    mlH: round(mlH, decimali),
    formula: `${parti.join(' + ')} = ${formatNumero(mlH, decimali)} ml/h`,
  }
}

// --- Ventilazione --------------------------------------------------------------------------

/** Volume corrente pediatrico: Vt_ml = ml_kg x peso_kg (tipico 6-8 ml/kg; 5-6 ml/kg in ARDS). */
export function calcolaVtPediatrico({ pesoKg, mlKg }, { decimali = 0 } = {}) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaVtPediatrico: peso mancante o non valido')
  }
  if (!(mlKg > 0)) {
    throw new Error('calcolaVtPediatrico: ml/kg mancante o non valido')
  }

  const vt = mlKg * pesoKg
  const formula = `${formatNumero(mlKg, 1)} ml/kg × ${formatNumero(pesoKg, 1)} kg = ${formatNumero(vt, decimali)} ml`

  return { vtMl: round(vt, decimali), formula }
}

// --- Peso: IBW pediatrico (eccezione, non nel flusso normale) ------------------------------

/**
 * IBW pediatrico (Traub-Johnson): IBW_kg = 2.396 * e^(0.01863 * altezza_cm), valida per
 * bambini ~1-17 anni. STRUMENTO ECCEZIONALE, non collegato a risolviPeso/pesoResolver: in
 * pediatria il peso di riferimento per il dosaggio farmaci resta SEMPRE il peso reale (vedi
 * data/pediatria-presidi.json -> calcolo_pesi, e la guardia pediatrica in pesoResolver.js).
 * Da consultare solo in casi selezionati (es. bambino obeso), mai come sostituto
 * automatico del peso reale.
 */
export function calcolaIBWPediatricoTraubJohnson(altezzaCm, { decimali = 1 } = {}) {
  if (!(altezzaCm > 0)) {
    throw new Error('calcolaIBWPediatricoTraubJohnson: altezza mancante o non valida')
  }

  const ibw = 2.396 * Math.exp(0.01863 * altezzaCm)
  const formula = `2.396 × e^(0.01863 × ${formatNumero(altezzaCm, 0)}) = ${formatNumero(ibw, decimali)} kg`

  return { ibwKg: round(ibw, decimali), formula }
}
