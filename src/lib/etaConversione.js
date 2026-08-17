// Conversione e formattazione dell'eta per l'inserimento separato in anni + mesi, utile
// sotto i 3 anni dove "anni decimali" (es. 0.6666666...) e' poco leggibile e poco pratico
// da digitare. Il profilo continua a lavorare internamente SEMPRE in anni decimali
// (profile.eta): la UI combina anni e mesi solo per l'inserimento/la visualizzazione, cosi'
// categoriaEta, selezionaDose e tutto il resto del codice esistente non cambiano.

/** Sotto questa eta (in anni) la UI mostra il valore in mesi (o anni+mesi combinati)
 * anziche' in anni decimali. */
export const SOGLIA_ETA_MESI_ANNI = 3

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
 * Combina anni e mesi (due campi separati, sempre disponibili nel form) in un unico
 * valore di eta in anni decimali. Un componente mancante/non numerico conta come 0
 * (es. mesi lasciato vuoto): l'unico caso di eta "non impostata" e' deciso dal chiamante
 * (che sa se l'utente non ha inserito nulla in nessuno dei due campi), non da questa
 * funzione, che quindi restituisce sempre un numero per un input valido (>= 0).
 */
export function calcolaEtaDecimale(anni, mesi) {
  const a = anni === null || anni === undefined || Number.isNaN(anni) ? 0 : anni
  const m = mesi === null || mesi === undefined || Number.isNaN(mesi) ? 0 : mesi

  if (!(a >= 0) || !(m >= 0)) return null

  return a + m / 12
}

/**
 * Formatta l'eta per la visualizzazione: sotto i 3 anni in mesi, combinando anni e mesi
 * quando entrambi sono presenti (es. "2 anni e 3 mesi"), o solo mesi quando la parte in
 * anni interi e' 0 (es. "8 mesi"). Dai 3 anni in su, solo anni (es. "5 anni"). Restituisce
 * null se l'eta non e' nota.
 */
export function formatEta(anniDecimali) {
  if (anniDecimali === null || anniDecimali === undefined || !(anniDecimali >= 0)) {
    return null
  }

  if (anniDecimali >= SOGLIA_ETA_MESI_ANNI) {
    return `${formatAnni(anniDecimali)} anni`
  }

  const anniInteri = Math.floor(anniDecimali)
  let anni = anniInteri
  let mesi = Math.round(anniAMesi(anniDecimali - anniInteri))

  // Arrotondamento al limite (es. 2.9999 anni -> 12 mesi residui): riporta a un anno
  // intero in piu' invece di mostrare "12 mesi".
  if (mesi === 12) {
    mesi = 0
    anni += 1
  }

  const testoMesi = `${mesi} ${mesi === 1 ? 'mese' : 'mesi'}`
  if (anni === 0) {
    return testoMesi
  }

  const testoAnni = `${anni} ${anni === 1 ? 'anno' : 'anni'}`
  if (mesi === 0) {
    return testoAnni
  }

  return `${testoAnni} e ${testoMesi}`
}
