import { LABEL_CATEGORIA } from '../lib/profiloFormat'
import { Icona } from './Icona.jsx'
import './Navigazione.css'

// Esito del profilo: categoria calcolata dall'eta' e sblocchi attivi, finora presenti solo
// nella logica. "ostetricia" arriva da etaFertileEuristica (stessa regola del modulo).
export function BadgeProfilo({ categoria, ostetricia }) {
  return (
    <div className="badge-profilo" aria-label="Categoria e sblocchi">
      {categoria ? (
        <span className="badge badge-lg badge-accent">
          <Icona nome="profilo" size={16} />
          Categoria: {LABEL_CATEGORIA[categoria]}
        </span>
      ) : (
        <span className="badge badge-lg badge-neutro">
          <Icona nome="profilo" size={16} />
          Categoria: inserisci l'età
        </span>
      )}
      {ostetricia && (
        <span className="badge badge-lg badge-success">
          <Icona nome="ostetricia" size={16} />
          Ostetricia sbloccata
        </span>
      )}
    </div>
  )
}
