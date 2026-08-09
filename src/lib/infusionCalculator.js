// Motore condiviso per il calcolatore infusione γ (mcg/kg/min) ↔ ml/h, come da
// PROGETTO.md > Modulo 1 "Calcolatore γ/kg/min → ml/h (paziente + diluizione)".
// La concentrazione della diluizione e' input libero dell'utente (mg farmaco in ml
// soluzione), non un elenco precompilato di diluizioni tipiche.

function formatNumero(valore, decimali) {
  return String(Number(valore.toFixed(decimali)))
}

/** Concentrazione (mcg/ml) da una diluizione libera "mg di farmaco in ml di soluzione". */
export function calcolaConcentrazione(mgFarmaco, mlSoluzione) {
  if (!(mgFarmaco > 0) || !(mlSoluzione > 0)) {
    throw new Error('calcolaConcentrazione: mg di farmaco e ml di soluzione devono essere numeri positivi')
  }
  return (mgFarmaco * 1000) / mlSoluzione
}

/**
 * Converte tra dose target (mcg/kg/min) e velocita' di infusione (ml/h), in entrambe
 * le direzioni: passare esattamente uno tra doseMcgKgMin e mlH, l'altro viene calcolato.
 *
 * @param {{ pesoKg: number, concentrazioneMcgMl: number, doseMcgKgMin?: number, mlH?: number, decimali?: number }} input
 */
export function calcolaInfusione({ pesoKg, concentrazioneMcgMl, doseMcgKgMin, mlH, decimali = 2 }) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaInfusione: peso del paziente mancante o non valido')
  }
  if (!(concentrazioneMcgMl > 0)) {
    throw new Error('calcolaInfusione: concentrazione della diluizione mancante o non valida')
  }

  const haDose = doseMcgKgMin !== undefined && doseMcgKgMin !== null
  const haMlH = mlH !== undefined && mlH !== null

  if (haDose === haMlH) {
    throw new Error('calcolaInfusione: specificare esattamente uno tra doseMcgKgMin e mlH')
  }

  if (haDose) {
    if (!(doseMcgKgMin > 0)) {
      throw new Error('calcolaInfusione: doseMcgKgMin deve essere un numero positivo')
    }
    const mcgOra = doseMcgKgMin * pesoKg * 60
    const mlHCalcolato = mcgOra / concentrazioneMcgMl
    const formula =
      `${formatNumero(doseMcgKgMin, decimali)} mcg/kg/min × ${formatNumero(pesoKg, decimali)} kg × 60 = ` +
      `${formatNumero(mcgOra, decimali)} mcg/h ÷ ${formatNumero(concentrazioneMcgMl, decimali)} mcg/ml = ` +
      `${formatNumero(mlHCalcolato, decimali)} ml/h`

    return {
      direzione: 'dose->mlH',
      pesoKg: Number(pesoKg.toFixed(decimali)),
      concentrazioneMcgMl: Number(concentrazioneMcgMl.toFixed(decimali)),
      doseMcgKgMin: Number(doseMcgKgMin.toFixed(decimali)),
      mlH: Number(mlHCalcolato.toFixed(decimali)),
      formula,
    }
  }

  if (!(mlH > 0)) {
    throw new Error('calcolaInfusione: mlH deve essere un numero positivo')
  }
  const mcgOra = mlH * concentrazioneMcgMl
  const doseCalcolata = mcgOra / (60 * pesoKg)
  const formula =
    `${formatNumero(mlH, decimali)} ml/h × ${formatNumero(concentrazioneMcgMl, decimali)} mcg/ml = ` +
    `${formatNumero(mcgOra, decimali)} mcg/h ÷ 60 ÷ ${formatNumero(pesoKg, decimali)} kg = ` +
    `${formatNumero(doseCalcolata, decimali)} mcg/kg/min`

  return {
    direzione: 'mlH->dose',
    pesoKg: Number(pesoKg.toFixed(decimali)),
    concentrazioneMcgMl: Number(concentrazioneMcgMl.toFixed(decimali)),
    doseMcgKgMin: Number(doseCalcolata.toFixed(decimali)),
    mlH: Number(mlH.toFixed(decimali)),
    formula,
  }
}

/**
 * Come calcolaInfusione, ma per farmaci dosati gia' su base oraria (es. propofol
 * manuale: mg/kg/h, concentrazione mg/ml) invece che al minuto: niente conversione
 * ×60 (che qui non ha senso, la dose e' gia' "all'ora"), condivide formattazione e
 * convenzioni di calcolaInfusione.
 *
 * @param {{ pesoKg: number, concentrazioneMgMl: number, doseMgKgH?: number, mlH?: number, decimali?: number }} input
 */
export function calcolaInfusioneOraria({ pesoKg, concentrazioneMgMl, doseMgKgH, mlH, decimali = 2 }) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaInfusioneOraria: peso del paziente mancante o non valido')
  }
  if (!(concentrazioneMgMl > 0)) {
    throw new Error('calcolaInfusioneOraria: concentrazione della diluizione mancante o non valida')
  }

  const haDose = doseMgKgH !== undefined && doseMgKgH !== null
  const haMlH = mlH !== undefined && mlH !== null

  if (haDose === haMlH) {
    throw new Error('calcolaInfusioneOraria: specificare esattamente uno tra doseMgKgH e mlH')
  }

  if (haDose) {
    if (!(doseMgKgH > 0)) {
      throw new Error('calcolaInfusioneOraria: doseMgKgH deve essere un numero positivo')
    }
    const mgOra = doseMgKgH * pesoKg
    const mlHCalcolato = mgOra / concentrazioneMgMl
    const formula =
      `${formatNumero(doseMgKgH, decimali)} mg/kg/h × ${formatNumero(pesoKg, decimali)} kg = ` +
      `${formatNumero(mgOra, decimali)} mg/h ÷ ${formatNumero(concentrazioneMgMl, decimali)} mg/ml = ` +
      `${formatNumero(mlHCalcolato, decimali)} ml/h`

    return {
      direzione: 'dose->mlH',
      pesoKg: Number(pesoKg.toFixed(decimali)),
      concentrazioneMgMl: Number(concentrazioneMgMl.toFixed(decimali)),
      doseMgKgH: Number(doseMgKgH.toFixed(decimali)),
      mlH: Number(mlHCalcolato.toFixed(decimali)),
      formula,
    }
  }

  if (!(mlH > 0)) {
    throw new Error('calcolaInfusioneOraria: mlH deve essere un numero positivo')
  }
  const mgOra = mlH * concentrazioneMgMl
  const doseCalcolata = mgOra / pesoKg
  const formula =
    `${formatNumero(mlH, decimali)} ml/h × ${formatNumero(concentrazioneMgMl, decimali)} mg/ml = ` +
    `${formatNumero(mgOra, decimali)} mg/h ÷ ${formatNumero(pesoKg, decimali)} kg = ` +
    `${formatNumero(doseCalcolata, decimali)} mg/kg/h`

  return {
    direzione: 'mlH->dose',
    pesoKg: Number(pesoKg.toFixed(decimali)),
    concentrazioneMgMl: Number(concentrazioneMgMl.toFixed(decimali)),
    doseMgKgH: Number(doseCalcolata.toFixed(decimali)),
    mlH: Number(mlH.toFixed(decimali)),
    formula,
  }
}
