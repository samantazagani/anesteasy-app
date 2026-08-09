// Soglie come da PROGETTO.md: anziano >= 65 anni. Pediatrico < 18 anni (il Modulo 3
// dedicato non e' ancora implementato: qui serve solo a guidare la scelta di fascia_eta).
const SOGLIA_ANZIANO = 65
const SOGLIA_PEDIATRICO = 18

/** @returns {'pediatrico' | 'adulto' | 'anziano' | null} null se l'eta' non e' nota */
export function categoriaEta(eta) {
  if (eta === null || eta === undefined || Number.isNaN(eta)) return null
  if (eta < SOGLIA_PEDIATRICO) return 'pediatrico'
  if (eta >= SOGLIA_ANZIANO) return 'anziano'
  return 'adulto'
}
