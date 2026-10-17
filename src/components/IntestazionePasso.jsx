import './IntestazionePasso.css'

// Intestazione di una sezione di selezione o di risultato (es. "1 Farmaco", "2 Contesto", "3 Dose"):
// numero, titolo in maiuscoletto, dettaglio opzionale (es. il farmaco scelto), una linea che
// delimita la sezione e un'azione opzionale a destra (es. "Cambia"). Numero facoltativo.
export function IntestazionePasso({ numero, titolo, dettaglio, azione }) {
  return (
    <h2 className="passo-intestazione">
      {numero !== undefined && (
        <span className="passo-numero" aria-hidden="true">
          {numero}
        </span>
      )}
      <span className="passo-titolo">{titolo}</span>
      {dettaglio && <span className="passo-dettaglio">{dettaglio}</span>}
      <span className="passo-linea" aria-hidden="true" />
      {azione}
    </h2>
  )
}
