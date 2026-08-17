import { calcolaLAST } from '../lib/anestesiaLocaleCalculator'
import { BadgeVerifica } from './BadgeVerifica.jsx'
import '../styles/risultato.css'
import './SezioneLAST.css'

export function SezioneLAST({ lastData, pesoKg }) {
  let last = null
  if (pesoKg > 0) {
    last = calcolaLAST(lastData, pesoKg)
  }

  return (
    <div className="riquadro-last" id="last">
      <div className="riga-meta">
        <span className="badge-emergenza">EMERGENZA · LAST</span>
        <BadgeVerifica verificato={lastData.verificato} />
      </div>

      <h2>Local Anesthetic Systemic Toxicity</h2>
      <p className="sottotitolo">{lastData.descrizione}</p>

      {!(pesoKg > 0) && (
        <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>
      )}

      {last && (
        <div className="formula-a-vista">
          <p className="etichetta-last">Bolo</p>
          <p className="risultato-primario">{last.boloMl} ml</p>
          <p className="formula">{last.formulaBolo}</p>

          <p className="etichetta-last">Infusione</p>
          <p className="risultato-primario">{last.infusioneMlH} ml/h</p>
          <p className="formula">{last.formulaInfusione}</p>

          <p className="nota">Ripetizione: {lastData.ripetizione}</p>
        </div>
      )}

      <p className="fonte">
        Fonte: {lastData.fonte}
        {lastData.pagina ? `, p. ${lastData.pagina}` : ''}
      </p>
    </div>
  )
}
