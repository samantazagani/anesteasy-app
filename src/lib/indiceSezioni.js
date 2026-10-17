/**
 * Sezione "corrente" mentre si scorre: tra quelle il cui bordo alto ha gia' superato la linea
 * sotto le barre fisse, la piu' vicina alla linea (con due colonne affiancate vince quella
 * che inizia piu' in basso; a parita', la prima nell'ordine del documento). Prima che una
 * sezione raggiunga la linea resta attiva la prima.
 * - escludi[i]: la sezione sta in un elemento sticky (resta sempre sotto la linea e
 *   falserebbe il calcolo): non puo' diventare corrente scorrendo, ma resta cliccabile.
 * - inFondo: la pagina e' scesa fino in fondo, quindi l'ultima sezione non puo' piu'
 *   raggiungere la linea: e' lei la corrente.
 * @param {number[]} tops bordo alto di ogni sezione (px dalla cima della finestra), in ordine di documento
 * @param {number} linea posizione della linea di lettura (px dalla cima della finestra)
 * @param {{escludi?: boolean[], inFondo?: boolean}} [opzioni]
 */
export function sezioneAttiva(tops, linea, { escludi = [], inFondo = false } = {}) {
  const valide = tops.map((_, i) => !escludi[i])
  if (inFondo) {
    for (let i = tops.length - 1; i >= 0; i -= 1) if (valide[i]) return i
  }
  let migliore = 0
  let topMigliore = -Infinity
  tops.forEach((top, i) => {
    if (valide[i] && top <= linea && top > topMigliore) {
      migliore = i
      topMigliore = top
    }
  })
  return migliore
}
