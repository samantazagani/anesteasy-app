// Risolve un passo di un'emergenza (data/emergenze.json > emergenze[].passi) al tipo di
// contenuto da mostrare nello stepper e, per i passi farmaco, alla dose/motore da usare.
// Non ricalcola nulla direttamente: richiama selezionaDose (stessa logica del calcolatore
// dose bolo) e lascia poi a doseCalculator/infusionCalculator il calcolo numerico.

import { selezionaDose } from './selezioneDose'

/**
 * @param {object} passo
 * @returns {'azione' | 'farmaco' | 'last'}
 */
export function tipoPasso(passo) {
  if (passo.riferimento) return 'last'
  if (passo.farmaco_id) return 'farmaco'
  return 'azione'
}

/** Un'unita "mg/kg/min", "mcg/kg/min", "mg/kg/h" ecc. descrive un'infusione continua
 * (richiede una diluizione per tradurla in ml/h), non un bolo singolo. */
export function isInfusione(unita) {
  return /\/(min|h)$/.test(unita)
}

/**
 * Risolve farmaco + voce di dose per un passo con farmaco_id/contesto.
 *
 * La fascia_eta indicata nel passo (se presente) prevale sempre su quella del profilo
 * paziente: l'utente sta gestendo esplicitamente quello scenario (es. un'emergenza
 * pediatrica), anche se il profilo caricato fosse per errore quello di un adulto. In
 * assenza di fascia_eta nel passo si ricade sul comportamento di selezionaDose, identico
 * al calcolatore dose bolo.
 *
 * @param {object} passo passo.farmaco_id + passo.contesto (+ passo.fascia_eta opzionale)
 * @param {Array<object>} farmaci farmaciData.farmaci
 * @param {'pediatrico' | 'adulto' | 'anziano' | null} categoriaProfilo
 * @returns {{ farmaco: object|null, doseScelta: object|null, fasciaUsata: string|null, fallback: boolean, motore: 'bolo'|'infusione'|null }}
 */
export function risolviPassoFarmaco(passo, farmaci, categoriaProfilo) {
  const farmaco = farmaci.find((f) => f.id === passo.farmaco_id) ?? null
  if (!farmaco) {
    return { farmaco: null, doseScelta: null, fasciaUsata: null, fallback: false, motore: null }
  }

  const fasciaRichiesta = passo.fascia_eta ?? categoriaProfilo
  const selezione = selezionaDose(farmaco.dosi, passo.contesto, fasciaRichiesta)
  const doseScelta = selezione.candidati[0] ?? null

  return {
    farmaco,
    doseScelta,
    fasciaUsata: selezione.fasciaUsata,
    fallback: selezione.fallback,
    motore: doseScelta ? (isInfusione(doseScelta.unita) ? 'infusione' : 'bolo') : null,
  }
}
