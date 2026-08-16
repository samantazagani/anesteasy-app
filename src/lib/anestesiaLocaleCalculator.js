// Motore condiviso per i calcolatori del Modulo 2 (Anestetici locali), come descritti
// in data/anestetici-locali.json > calcolatori: volume massimo iniettabile, diluizione
// da fiala, riempimento elastomero, tossicita' additiva e bolo/infusione LAST.

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

function formatNumero(valore, decimali) {
  return String(round(valore, decimali))
}

/** 1% = 10 mg/ml (data/anestetici-locali.json > conversione_concentrazione). */
export function mgMlDaPercento(percento) {
  return percento * 10
}

export function percentoDaMgMl(mgMl) {
  return mgMl / 10
}

/**
 * Volume massimo iniettabile: dose_max_mg = min(mg_kg * peso, tetto_assoluto_mg),
 * poi volume_max_ml = dose_max_mg / concentrazione_mg_ml. I due tetti (per kg e
 * assoluto) sono indipendenti: va sempre preso il piu' basso dei due, non solo il primo.
 *
 * @param {object} anestetico voce da data/anestetici-locali.json > anestetici
 * @param {{ conAdrenalina: boolean, pesoKg: number, concentrazionePercento: number }} input
 */
export function calcolaVolumeMassimo(
  anestetico,
  { conAdrenalina, pesoKg, concentrazionePercento },
  { decimali = 2 } = {},
) {
  if (!anestetico) {
    throw new Error('calcolaVolumeMassimo: anestetico mancante')
  }
  if (!(pesoKg > 0)) {
    throw new Error('calcolaVolumeMassimo: peso del paziente mancante o non valido')
  }
  if (!(concentrazionePercento > 0)) {
    throw new Error('calcolaVolumeMassimo: concentrazione mancante o non valida')
  }

  const chiave = conAdrenalina ? 'con_adrenalina' : 'senza_adrenalina'
  const doseMgKg = anestetico.dose_max_mg_kg[chiave]
  const tettoAssolutoMg = anestetico.tetto_assoluto_mg[chiave]
  const doseDaPesoMg = doseMgKg * pesoKg
  const doseMaxMg = Math.min(doseDaPesoMg, tettoAssolutoMg)
  const tettoLimitante = doseDaPesoMg > tettoAssolutoMg ? 'assoluto' : 'peso'
  const concentrazioneMgMl = mgMlDaPercento(concentrazionePercento)
  const volumeMaxMl = doseMaxMg / concentrazioneMgMl

  const formula =
    `min(${formatNumero(doseMgKg, decimali)} mg/kg × ${formatNumero(pesoKg, decimali)} kg = ${formatNumero(doseDaPesoMg, decimali)} mg` +
    `; tetto assoluto ${formatNumero(tettoAssolutoMg, decimali)} mg) = ${formatNumero(doseMaxMg, decimali)} mg` +
    ` → ${formatNumero(doseMaxMg, decimali)} mg ÷ ${formatNumero(concentrazioneMgMl, decimali)} mg/ml = ${formatNumero(volumeMaxMl, decimali)} ml`

  return {
    doseMgKg,
    tettoAssolutoMg,
    doseDaPesoMg: round(doseDaPesoMg, decimali),
    doseMaxMg: round(doseMaxMg, decimali),
    tettoLimitante,
    concentrazioneMgMl: round(concentrazioneMgMl, decimali),
    volumeMaxMl: round(volumeMaxMl, decimali),
    formula,
  }
}

/**
 * Diluizione da fiala: volume da prelevare dalla fiala per ottenere una concentrazione
 * target in un volume finale, il resto e' fisiologica.
 *
 * @param {{ concFialaMgMl: number, concTargetMgMl: number, volumeFinaleMl: number, volumeFialaMl?: number }} input
 */
export function calcolaDiluizione(
  { concFialaMgMl, concTargetMgMl, volumeFinaleMl, volumeFialaMl },
  { decimali = 2 } = {},
) {
  if (!(concFialaMgMl > 0)) {
    throw new Error('calcolaDiluizione: concentrazione della fiala mancante o non valida')
  }
  if (!(concTargetMgMl > 0)) {
    throw new Error('calcolaDiluizione: concentrazione target mancante o non valida')
  }
  if (!(volumeFinaleMl > 0)) {
    throw new Error('calcolaDiluizione: volume finale mancante o non valido')
  }
  if (concTargetMgMl > concFialaMgMl) {
    throw new Error('calcolaDiluizione: la concentrazione target non puo superare quella della fiala')
  }

  const volumeDaPrelevareMl = (concTargetMgMl * volumeFinaleMl) / concFialaMgMl
  const fisiologicaMl = volumeFinaleMl - volumeDaPrelevareMl
  const formula =
    `(${formatNumero(concTargetMgMl, decimali)} mg/ml × ${formatNumero(volumeFinaleMl, decimali)} ml) ÷ ${formatNumero(concFialaMgMl, decimali)} mg/ml` +
    ` = ${formatNumero(volumeDaPrelevareMl, decimali)} ml AL + ${formatNumero(fisiologicaMl, decimali)} ml fisiologica`

  let fialeNecessarie = null
  let superaVolumeFiala = false
  if (volumeFialaMl > 0) {
    fialeNecessarie = Math.ceil(volumeDaPrelevareMl / volumeFialaMl)
    superaVolumeFiala = volumeDaPrelevareMl > volumeFialaMl
  }

  return {
    volumeDaPrelevareMl: round(volumeDaPrelevareMl, decimali),
    fisiologicaMl: round(fisiologicaMl, decimali),
    fialeNecessarie,
    superaVolumeFiala,
    formula,
  }
}

/**
 * Riempimento elastomero: quante fiale servono per un volume totale a una concentrazione
 * target, il resto del volume e' fisiologica.
 *
 * @param {{ concTargetMgMl: number, volumeTotaleMl: number, mgPerFiala: number, volumeFialaMl: number }} input
 */
export function calcolaElastomero(
  { concTargetMgMl, volumeTotaleMl, mgPerFiala, volumeFialaMl },
  { decimali = 2 } = {},
) {
  if (!(concTargetMgMl > 0)) {
    throw new Error('calcolaElastomero: concentrazione target mancante o non valida')
  }
  if (!(volumeTotaleMl > 0)) {
    throw new Error('calcolaElastomero: volume totale mancante o non valido')
  }
  if (!(mgPerFiala > 0)) {
    throw new Error('calcolaElastomero: mg per fiala mancante o non valido')
  }
  if (!(volumeFialaMl > 0)) {
    throw new Error('calcolaElastomero: volume della fiala mancante o non valido')
  }

  const mgTotali = concTargetMgMl * volumeTotaleMl
  const nFiale = mgTotali / mgPerFiala
  const volumeALMl = nFiale * volumeFialaMl
  const fisiologicaMl = volumeTotaleMl - volumeALMl
  const superaVolumeTotale = volumeALMl > volumeTotaleMl

  const formula =
    `${formatNumero(concTargetMgMl, decimali)} mg/ml × ${formatNumero(volumeTotaleMl, decimali)} ml = ${formatNumero(mgTotali, decimali)} mg` +
    ` → ${formatNumero(mgTotali, decimali)} mg ÷ ${formatNumero(mgPerFiala, decimali)} mg/fiala = ${formatNumero(nFiale, decimali)} fiale` +
    ` (${formatNumero(volumeALMl, decimali)} ml AL) + ${formatNumero(fisiologicaMl, decimali)} ml fisiologica`

  return {
    mgTotali: round(mgTotali, decimali),
    nFiale: round(nFiale, decimali),
    volumeALMl: round(volumeALMl, decimali),
    fisiologicaMl: round(fisiologicaMl, decimali),
    superaVolumeTotale,
    formula,
  }
}

/**
 * Tossicita' additiva: con AL misti la tossicita' si somma come percentuale della dose
 * max di ciascuno (dose_max_mg_kg/tetto_assoluto propri), non della dose massima assoluta
 * di un solo farmaco.
 *
 * @param {Array<{ anestetico: object, conAdrenalina: boolean, pesoKg: number, doseSommistrataMg: number }>} voci
 */
export function calcolaTossicitaAdditiva(voci, { decimali = 1 } = {}) {
  const righe = voci.map(({ anestetico, conAdrenalina, pesoKg, doseSommistrataMg }) => {
    const chiave = conAdrenalina ? 'con_adrenalina' : 'senza_adrenalina'
    const doseMgKg = anestetico.dose_max_mg_kg[chiave]
    const tettoAssolutoMg = anestetico.tetto_assoluto_mg[chiave]
    const tettoMg = pesoKg > 0 ? Math.min(doseMgKg * pesoKg, tettoAssolutoMg) : tettoAssolutoMg
    const percentuale = tettoMg > 0 ? (doseSommistrataMg / tettoMg) * 100 : 0

    return {
      id: anestetico.id,
      nome: anestetico.nome,
      tettoMg: round(tettoMg, decimali),
      percentuale: round(percentuale, decimali),
    }
  })

  const percentualeTotale = round(
    righe.reduce((somma, riga) => somma + riga.percentuale, 0),
    decimali,
  )

  return { righe, percentualeTotale, supera: percentualeTotale > 100 }
}

/**
 * Bolo e infusione di emulsione lipidica 20% per il trattamento del LAST, da
 * data/anestetici-locali.json > last.
 *
 * @param {object} lastData nodo "last" del json
 */
export function calcolaLAST(lastData, pesoKg, { decimali = 2 } = {}) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaLAST: peso del paziente mancante o non valido')
  }

  const boloMl = pesoKg * lastData.bolo.valore
  const infusioneMlMin = pesoKg * lastData.infusione.valore
  const infusioneMlH = infusioneMlMin * 60

  const formulaBolo = `${formatNumero(lastData.bolo.valore, decimali)} ${lastData.bolo.unita} × ${formatNumero(pesoKg, decimali)} kg = ${formatNumero(boloMl, decimali)} ml`
  const formulaInfusione =
    `${formatNumero(lastData.infusione.valore, decimali)} ${lastData.infusione.unita} × ${formatNumero(pesoKg, decimali)} kg` +
    ` = ${formatNumero(infusioneMlMin, decimali)} ml/min (${formatNumero(infusioneMlH, decimali)} ml/h) per ${lastData.infusione.durata_min} min`

  return {
    boloMl: round(boloMl, decimali),
    infusioneMlMin: round(infusioneMlMin, decimali),
    infusioneMlH: round(infusioneMlH, decimali),
    formulaBolo,
    formulaInfusione,
  }
}
