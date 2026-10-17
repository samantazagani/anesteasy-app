import { useMediaQuery } from '../lib/useMediaQuery.js'
import { IntestazionePasso } from './IntestazionePasso.jsx'
import './IntestazionePasso.css'

// Passo di selezione come scheda che si richiude dopo la scelta: aperta mostra `children` (l'elenco
// di scelta), chiusa mostra `riassunto` (la scelta fatta) e un pulsante "Cambia" che la riapre.
// `sempre` e' sempre visibile (es. controlli legati alla scelta). Con `sempreApertaDesktop`, da 1024px
// l'elenco resta aperto: li' e' la navigazione fissa a sinistra e c'e' spazio.
export function SchedaPasso({ numero, titolo, riassunto, aperta, onApri, sempreApertaDesktop = false, sempre, children }) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const mostraElenco = aperta || !riassunto || (sempreApertaDesktop && desktop)

  return (
    <div className="passo-scheda">
      <IntestazionePasso
        numero={numero}
        titolo={titolo}
        azione={
          mostraElenco ? null : (
            <button type="button" className="passo-intestazione-azione" aria-expanded="false" onClick={onApri}>
              Cambia
            </button>
          )
        }
      />
      {mostraElenco ? children : <div className="passo-riassunto">{riassunto}</div>}
      {sempre}
    </div>
  )
}
