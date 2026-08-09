// Sceglie, tra le dosi di un farmaco per un dato contesto, quelle della fascia_eta
// del paziente; se assente ricade su 'adulto' (esplicitando il fallback), come da
// PROGETTO.md > "Fascia d'eta (scelta automatica del dosaggio)".
//
// Alcuni farmaci hanno piu' voci per lo stesso contesto+fascia_eta (es. sugammadex
// "reversal" con blocco moderato/profondo/RSI, oppure fentanyl "neuroassiale" con via
// intratecale/peridurale): in quel caso vengono restituiti tutti i candidati, e la UI
// fa scegliere la variante (per via se distingue i candidati, altrimenti per nota).

function fasciaDellaVoce(dose) {
  return dose.fascia_eta ?? 'adulto'
}

/**
 * @param {Array<object>} dosi farmaco.dosi
 * @param {string} contesto
 * @param {'pediatrico' | 'adulto' | 'anziano' | null} categoria
 * @returns {{ candidati: Array<object>, fasciaUsata: string | null, fallback: boolean, categoriaRichiesta?: string }}
 */
export function selezionaDose(dosi, contesto, categoria) {
  const candidatiContesto = dosi.filter((d) => d.contesto === contesto)
  if (candidatiContesto.length === 0) {
    return { candidati: [], fasciaUsata: null, fallback: false }
  }

  const categoriaEffettiva = categoria ?? 'adulto'
  const perCategoria = candidatiContesto.filter((d) => fasciaDellaVoce(d) === categoriaEffettiva)
  if (perCategoria.length > 0) {
    return { candidati: perCategoria, fasciaUsata: categoriaEffettiva, fallback: false }
  }

  const perAdulto = candidatiContesto.filter((d) => fasciaDellaVoce(d) === 'adulto')
  if (perAdulto.length > 0) {
    return {
      candidati: perAdulto,
      fasciaUsata: 'adulto',
      fallback: true,
      categoriaRichiesta: categoriaEffettiva,
    }
  }

  return { candidati: [], fasciaUsata: null, fallback: false }
}

const LABEL_VIA = {
  IV: 'EV',
  IM: 'IM',
  os: 'Os',
  peridurale: 'Peridurale',
  intratecale: 'Intratecale',
}

/** Etichetta per distinguere in UI piu' candidati dello stesso contesto+fascia. */
export function etichettaVariante(dose, indice) {
  if (dose.via) return LABEL_VIA[dose.via] ?? dose.via
  if (dose.note) return dose.note
  return `Opzione ${indice + 1}`
}
