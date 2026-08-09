// Motore condiviso per i calcolatori di dose (bolo, infusione, ecc.).
// Legge direttamente le voci di dose come strutturate in data/farmaci.json
// ({ valore, unita, ... } oppure { min, max, unita, ... }) e restituisce sia il
// risultato numerico sia la formula "a vista" richiesta da PROGETTO.md, es.
// "1.5–2.5 mg/kg × 70 kg = 105–175 mg".

function formatNumero(valore, decimali) {
  return String(Number(valore.toFixed(decimali)))
}

// Un'unita del tipo "mg/kg", "mcg/kg", "mg/kg/h", "mcg/kg/min" va moltiplicata
// per il peso; "mg", "mcg", "mcg/ml", "ng/ml" sono dosi/target fissi indipendenti dal peso.
function richiedePesoPerUnita(unita) {
  return unita.includes('/kg')
}

function unitaRisultato(unita) {
  return richiedePesoPerUnita(unita) ? unita.replace('/kg', '') : unita
}

/**
 * @param {{ valore?: number, min?: number, max?: number, unita: string }} dose
 * @param {number} [pesoKg] peso del paziente già risolto dal profilo (reale/IBW/LBW)
 * @param {{ decimali?: number }} [opzioni]
 */
export function calcolaDose(dose, pesoKg, { decimali = 2 } = {}) {
  if (!dose || typeof dose.unita !== 'string' || dose.unita === '') {
    throw new Error('calcolaDose: unita mancante nella voce di dose')
  }

  const haRange = dose.min !== undefined && dose.max !== undefined
  const haValore = dose.valore !== undefined

  if (!haRange && !haValore) {
    throw new Error('calcolaDose: la voce di dose deve avere "valore" oppure "min" e "max"')
  }

  const richiedePeso = richiedePesoPerUnita(dose.unita)
  if (richiedePeso && !(pesoKg > 0)) {
    throw new Error(
      `calcolaDose: peso del paziente mancante o non valido, richiesto per l'unita "${dose.unita}"`,
    )
  }

  const unitaOut = unitaRisultato(dose.unita)
  const applica = (v) => (richiedePeso ? v * pesoKg : v)

  if (haRange) {
    const min = applica(dose.min)
    const max = applica(dose.max)
    const testoInput = `${formatNumero(dose.min, decimali)}–${formatNumero(dose.max, decimali)} ${dose.unita}`
    const testoOutput = `${formatNumero(min, decimali)}–${formatNumero(max, decimali)} ${unitaOut}`
    const formula = richiedePeso
      ? `${testoInput} × ${formatNumero(pesoKg, decimali)} kg = ${testoOutput}`
      : testoInput

    return {
      tipo: 'range',
      min: Number(min.toFixed(decimali)),
      max: Number(max.toFixed(decimali)),
      unita: unitaOut,
      richiedePeso,
      formula,
    }
  }

  const risultato = applica(dose.valore)
  const testoInput = `${formatNumero(dose.valore, decimali)} ${dose.unita}`
  const testoOutput = `${formatNumero(risultato, decimali)} ${unitaOut}`
  const formula = richiedePeso
    ? `${testoInput} × ${formatNumero(pesoKg, decimali)} kg = ${testoOutput}`
    : testoInput

  return {
    tipo: 'singolo',
    valore: Number(risultato.toFixed(decimali)),
    unita: unitaOut,
    richiedePeso,
    formula,
  }
}
