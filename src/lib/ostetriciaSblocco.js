export const SOGLIA_ETA_FERTILE_MIN = 12
export const SOGLIA_ETA_FERTILE_MAX = 50

/**
 * Regola che attiva il modulo Ostetricia: sesso F ed eta' 12-50 anni. E' un'euristica per
 * "eta' fertile", usata solo per proporre il modulo al momento giusto (non un dato clinico).
 * Unica fonte di verita': il modulo e il pannello paziente del menu devono concordare.
 */
export function etaFertileEuristica(sesso, eta) {
  return (
    sesso === 'F' &&
    eta !== null &&
    eta !== undefined &&
    eta >= SOGLIA_ETA_FERTILE_MIN &&
    eta <= SOGLIA_ETA_FERTILE_MAX
  )
}
