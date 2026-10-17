import './IntestazionePasso.css'

// Intestazione di una sezione di selezione o di risultato (es. "1 Farmaco", "2 Contesto", "3 Dose"):
// numero, titolo in maiuscoletto e una linea che delimita la sezione. Il numero e' facoltativo.
export function IntestazionePasso({ numero, titolo }) {
  return (
    <h2 className="passo-intestazione">
      {numero !== undefined && (
        <span className="passo-numero" aria-hidden="true">
          {numero}
        </span>
      )}
      <span className="passo-titolo">{titolo}</span>
    </h2>
  )
}
