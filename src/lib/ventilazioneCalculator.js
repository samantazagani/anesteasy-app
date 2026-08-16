// Motore condiviso per il Modulo 9 (Ventilazione), letto da data/ventilazione.json.
// Il PBW qui NON e' l'IBW del profilo paziente (src/lib/anthropometrics.js): e' una
// formula diversa, specifica di questo file (50/45.5 + 0.91×(altezza-152.4)), nonostante
// il nome "peso ideale" suoni simile. Non riusare pesoResolver/IBW per Vt su PBW.

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

function formatNumero(valore, decimali) {
  return String(round(valore, decimali))
}

/** Peso corporeo predetto (PBW): 50 + 0.91×(altezza-152.4) uomo, 45.5 + ... donna. */
export function calcolaPBW({ sesso, altezzaCm }, { decimali = 1 } = {}) {
  if (sesso !== 'M' && sesso !== 'F') {
    throw new Error('calcolaPBW: sesso mancante o non valido (M/F)')
  }
  if (!(altezzaCm > 0)) {
    throw new Error('calcolaPBW: altezza mancante o non valida')
  }

  const base = sesso === 'M' ? 50 : 45.5
  const pbwKg = base + 0.91 * (altezzaCm - 152.4)
  const formula = `${base} + 0.91 × (${formatNumero(altezzaCm, 0)} - 152.4) = ${formatNumero(pbwKg, decimali)} kg`

  return { pbwKg: round(pbwKg, decimali), formula }
}

/** Vt target dato un obiettivo ml/kg PBW (es. 6 ml/kg). */
export function calcolaVtTarget({ pbwKg, mlKg }, { decimali = 0 } = {}) {
  if (!(pbwKg > 0)) {
    throw new Error('calcolaVtTarget: PBW mancante o non valido')
  }
  if (!(mlKg > 0)) {
    throw new Error('calcolaVtTarget: ml/kg mancante o non valido')
  }

  const vtMl = mlKg * pbwKg
  const formula = `${formatNumero(mlKg, 1)} ml/kg × ${formatNumero(pbwKg, 1)} kg = ${formatNumero(vtMl, decimali)} ml`

  return { vtMl: round(vtMl, decimali), formula }
}

/** Vt/kg PBW attuale (per il confronto col limite vt_kg). */
export function calcolaVtPerKgPBW({ vtMl, pbwKg }, { decimali = 1 } = {}) {
  if (!(vtMl > 0)) {
    throw new Error('calcolaVtPerKgPBW: Vt mancante o non valido')
  }
  if (!(pbwKg > 0)) {
    throw new Error('calcolaVtPerKgPBW: PBW mancante o non valido')
  }

  const mlKg = vtMl / pbwKg
  const formula = `${formatNumero(vtMl, 0)} ml ÷ ${formatNumero(pbwKg, 1)} kg = ${formatNumero(mlKg, decimali)} ml/kg`

  return { mlKg: round(mlKg, decimali), formula }
}

/** Compliance statica: Vt / (Pplat - PEEP). */
export function calcolaComplianceStatica({ vtMl, pplat, peep }, { decimali = 1 } = {}) {
  if (!(vtMl > 0)) {
    throw new Error('calcolaComplianceStatica: Vt mancante o non valido')
  }
  if (!(pplat > peep)) {
    throw new Error('calcolaComplianceStatica: Pplat deve essere maggiore della PEEP')
  }

  const compliance = vtMl / (pplat - peep)
  const formula = `${formatNumero(vtMl, 0)} ÷ (${formatNumero(pplat, 1)} - ${formatNumero(peep, 1)}) = ${formatNumero(compliance, decimali)} ml/cmH2O`

  return { compliance: round(compliance, decimali), formula }
}

/** Compliance dinamica: Vt / (Ppeak - PEEP). */
export function calcolaComplianceDinamica({ vtMl, ppeak, peep }, { decimali = 1 } = {}) {
  if (!(vtMl > 0)) {
    throw new Error('calcolaComplianceDinamica: Vt mancante o non valido')
  }
  if (!(ppeak > peep)) {
    throw new Error('calcolaComplianceDinamica: Ppeak deve essere maggiore della PEEP')
  }

  const compliance = vtMl / (ppeak - peep)
  const formula = `${formatNumero(vtMl, 0)} ÷ (${formatNumero(ppeak, 1)} - ${formatNumero(peep, 1)}) = ${formatNumero(compliance, decimali)} ml/cmH2O`

  return { compliance: round(compliance, decimali), formula }
}

/** Driving pressure: Pplat - PEEP. */
export function calcolaDrivingPressure({ pplat, peep }, { decimali = 1 } = {}) {
  if (!(pplat >= 0) || !(peep >= 0)) {
    throw new Error('calcolaDrivingPressure: Pplat/PEEP mancanti o non validi')
  }

  const drivingPressure = pplat - peep
  const formula = `${formatNumero(pplat, 1)} - ${formatNumero(peep, 1)} = ${formatNumero(drivingPressure, decimali)} cmH2O`

  return { drivingPressure: round(drivingPressure, decimali), formula }
}

/**
 * Mechanical power (equazione di Gattinoni): 0.098 × RR × Vt_L × (Ppeak - 0.5×(Pplat-PEEP)).
 * Il coefficiente 0.098 e' segnalato dal JSON come da verificare con la fonte: la UI deve
 * mostrare un badge di attenzione dedicato, non il solo bozza standard.
 */
export function calcolaMechanicalPower({ rr, vtMl, ppeak, pplat, peep }, { decimali = 2 } = {}) {
  if (!(rr > 0)) {
    throw new Error('calcolaMechanicalPower: RR mancante o non valido')
  }
  if (!(vtMl > 0)) {
    throw new Error('calcolaMechanicalPower: Vt mancante o non valido')
  }
  if (!(ppeak >= 0) || !(pplat >= 0) || !(peep >= 0)) {
    throw new Error('calcolaMechanicalPower: Ppeak/Pplat/PEEP mancanti o non validi')
  }

  const vtL = vtMl / 1000
  const power = 0.098 * rr * vtL * (ppeak - 0.5 * (pplat - peep))
  const formula = `0.098 × ${formatNumero(rr, 0)} × ${formatNumero(vtL, 3)} × (${formatNumero(ppeak, 1)} - 0.5×(${formatNumero(pplat, 1)}-${formatNumero(peep, 1)})) = ${formatNumero(power, decimali)} J/min`

  return { power: round(power, decimali), formula }
}

/** Spazio morto (Bohr-Enghoff): (PaCO2 - PetCO2) / PaCO2. */
export function calcolaSpazioMorto({ paCO2, petCO2 }, { decimali = 2 } = {}) {
  if (!(paCO2 > 0)) {
    throw new Error('calcolaSpazioMorto: PaCO2 mancante o non valida')
  }
  if (!(petCO2 >= 0)) {
    throw new Error('calcolaSpazioMorto: PetCO2 mancante o non valida')
  }

  const vdVt = (paCO2 - petCO2) / paCO2
  const formula = `(${formatNumero(paCO2, 1)} - ${formatNumero(petCO2, 1)}) ÷ ${formatNumero(paCO2, 1)} = ${formatNumero(vdVt, decimali)}`

  return { vdVt: round(vdVt, decimali), formula }
}

/** P/F: PaO2 / FiO2 (FiO2 come frazione 0-1). */
export function calcolaPF({ paO2, fiO2 }, { decimali = 0 } = {}) {
  if (!(paO2 > 0)) {
    throw new Error('calcolaPF: PaO2 mancante o non valida')
  }
  if (!(fiO2 > 0) || fiO2 > 1) {
    throw new Error('calcolaPF: FiO2 mancante o non valida (frazione 0-1)')
  }

  const pf = paO2 / fiO2
  const formula = `${formatNumero(paO2, 0)} ÷ ${formatNumero(fiO2, 2)} = ${formatNumero(pf, decimali)}`

  return { pf: round(pf, decimali), formula }
}

/** Indice di ossigenazione: (FiO2 × Paw_media × 100) / PaO2. */
export function calcolaOxygenationIndex({ fiO2, pawMedia, paO2 }, { decimali = 1 } = {}) {
  if (!(fiO2 > 0) || fiO2 > 1) {
    throw new Error('calcolaOxygenationIndex: FiO2 mancante o non valida (frazione 0-1)')
  }
  if (!(pawMedia >= 0)) {
    throw new Error('calcolaOxygenationIndex: pressione media delle vie aeree mancante o non valida')
  }
  if (!(paO2 > 0)) {
    throw new Error('calcolaOxygenationIndex: PaO2 mancante o non valida')
  }

  const oi = (fiO2 * pawMedia * 100) / paO2
  const formula = `(${formatNumero(fiO2, 2)} × ${formatNumero(pawMedia, 1)} × 100) ÷ ${formatNumero(paO2, 0)} = ${formatNumero(oi, decimali)}`

  return { oi: round(oi, decimali), formula }
}

/** Contenuto di ossigeno nel sangue: 1.34 × Hb × saturazione + 0.003 × pO2. Riusato per
 * CaO2 (arterioso) e CvO2 (venoso, con SvO2/PvO2) da O2ER e VO2. */
export function calcolaContenutoO2({ hb, saturazione, pO2 }, { decimali = 2 } = {}) {
  if (!(hb > 0)) {
    throw new Error('calcolaContenutoO2: Hb mancante o non valida')
  }
  if (!(saturazione > 0) || saturazione > 1) {
    throw new Error('calcolaContenutoO2: saturazione mancante o non valida (frazione 0-1)')
  }
  if (!(pO2 >= 0)) {
    throw new Error('calcolaContenutoO2: pO2 mancante o non valida')
  }

  const cO2 = 1.34 * hb * saturazione + 0.003 * pO2
  const formula = `1.34 × ${formatNumero(hb, 1)} × ${formatNumero(saturazione, 2)} + 0.003 × ${formatNumero(pO2, 0)} = ${formatNumero(cO2, decimali)} ml/dL`

  return { cO2: round(cO2, decimali), formula }
}

/** Estrazione di ossigeno (O2ER): (CaO2 - CvO2) / CaO2. */
export function calcolaO2ER({ hb, saO2, paO2, svO2, pvO2 }, { decimali = 2 } = {}) {
  const arterioso = calcolaContenutoO2({ hb, saturazione: saO2, pO2: paO2 })
  const venoso = calcolaContenutoO2({ hb, saturazione: svO2, pO2: pvO2 })

  const o2er = (arterioso.cO2 - venoso.cO2) / arterioso.cO2
  const formula = `(${arterioso.cO2} - ${venoso.cO2}) ÷ ${arterioso.cO2} = ${formatNumero(o2er, decimali)}`

  return { o2er: round(o2er, decimali), caO2: arterioso.cO2, cvO2: venoso.cO2, formula }
}

/** Consumo di ossigeno (VO2, Fick): CO × (CaO2 - CvO2) × 10. */
export function calcolaVO2({ co, hb, saO2, paO2, svO2, pvO2 }, { decimali = 0 } = {}) {
  if (!(co > 0)) {
    throw new Error('calcolaVO2: portata cardiaca (CO) mancante o non valida')
  }

  const arterioso = calcolaContenutoO2({ hb, saturazione: saO2, pO2: paO2 })
  const venoso = calcolaContenutoO2({ hb, saturazione: svO2, pO2: pvO2 })

  const vo2 = co * (arterioso.cO2 - venoso.cO2) * 10
  const formula = `${formatNumero(co, 1)} × (${arterioso.cO2} - ${venoso.cO2}) × 10 = ${formatNumero(vo2, decimali)} ml/min`

  return { vo2: round(vo2, decimali), caO2: arterioso.cO2, cvO2: venoso.cO2, formula }
}

/** Autonomia bombola O2: (pressione_bar × capacita_L) / flusso_L_min. */
export function calcolaAutonomiaBombola({ pressioneBar, capacitaL, flussoLMin }, { decimali = 0 } = {}) {
  if (!(pressioneBar > 0)) {
    throw new Error('calcolaAutonomiaBombola: pressione mancante o non valida')
  }
  if (!(capacitaL > 0)) {
    throw new Error('calcolaAutonomiaBombola: capacita della bombola mancante o non valida')
  }
  if (!(flussoLMin > 0)) {
    throw new Error('calcolaAutonomiaBombola: flusso mancante o non valido')
  }

  const durataMin = (pressioneBar * capacitaL) / flussoLMin
  const formula = `(${formatNumero(pressioneBar, 0)} × ${formatNumero(capacitaL, 1)}) ÷ ${formatNumero(flussoLMin, 1)} = ${formatNumero(durataMin, decimali)} min`

  return { durataMin: round(durataMin, decimali), formula }
}

// --- Valori limite -------------------------------------------------------------------------

/**
 * Normalizza le tre forme di data/ventilazione.json > valori_limite (soglia_max, range,
 * target testuale "6 (4-8)") in { min, max }, con min/max null quando quel lato non e'
 * vincolato.
 */
export function normalizzaLimite(limite) {
  if (limite.range) {
    return { min: limite.range[0], max: limite.range[1] }
  }
  if (limite.soglia_max !== undefined) {
    return { min: null, max: limite.soglia_max }
  }
  if (limite.target) {
    const match = /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/.exec(limite.target)
    if (match) {
      return { min: Number(match[1]), max: Number(match[2]) }
    }
  }
  return { min: null, max: null }
}

/** Valuta un valore calcolato contro un limite del JSON: true = entro range/soglia. */
export function valutaLimite(valore, limite) {
  const { min, max } = normalizzaLimite(limite)
  const ok = (min === null || valore >= min) && (max === null || valore <= max)
  return { ok, min, max }
}
