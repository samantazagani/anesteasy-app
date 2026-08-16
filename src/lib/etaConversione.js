// Conversione e formattazione dell'eta per l'input in mesi, utile sotto i 3 anni dove
// "anni decimali" (es. 0.6666666...) e' poco leggibile e poco pratico da digitare.
// Il profilo continua a lavorare internamente SEMPRE in anni decimali (profile.eta): la
// UI converte in mesi solo per l'inserimento/la visualizzazione, cosi' categoriaEta,
// selezionaDose e tutto il resto del codice esistente non cambiano.

/** Sotto questa eta (in anni) la UI mostra il valore in mesi anziche' in anni decimali. */
export const SOGLIA_ETA_MESI_ANNI = 3

export function mesiAdAnni(mesi) {
  // "!(mesi >= 0)" da solo non basta: null >= 0 e' true in JS (null si converte a 0).
  if (mesi === null || mesi === undefined || !(mesi >= 0)) return null
  return mesi / 12
}

export function anniAMesi(anni) {
  if (anni === null || anni === undefined || !(anni >= 0)) return null
  return anni * 12
}

function formatAnni(anni) {
  // Number(...) sul risultato di toFixed toglie eventuali zeri decimali superflui
  // (es. "3.00" -> 3 -> "3"), mantenendo pero' i decimali quando servono davvero.
  return String(Number(anni.toFixed(2)))
}

/**
 * Formatta l'eta per la visualizzazione: sotto i 3 anni in mesi interi (es. "8 mesi"),
 * altrimenti in anni (es. "5 anni"). Restituisce null se l'eta non e' nota.
 */
export function formatEta(anniDecimali) {
  if (anniDecimali === null || anniDecimali === undefined || !(anniDecimali >= 0)) {
    return null
  }

  if (anniDecimali < SOGLIA_ETA_MESI_ANNI) {
    const mesi = Math.round(anniAMesi(anniDecimali))
    return `${mesi} ${mesi === 1 ? 'mese' : 'mesi'}`
  }

  return `${formatAnni(anniDecimali)} anni`
}
