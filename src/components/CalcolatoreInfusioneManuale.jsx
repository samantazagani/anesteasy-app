import { useId, useState } from 'react'
import { calcolaInfusioneOraria } from '../lib/infusionCalculator'
import { IntestazionePasso } from './IntestazionePasso.jsx'
import './CalcolatoreInfusioneManuale.css'

// Guidato dai dati: le concentrazioni (es. "PPF 1%" -> 10 mg/ml) arrivano da
// farmaco.calcolatore_infusione.concentrazioni_mg_ml in farmaci.json, non sono
// hardcoded qui. Se in futuro un altro farmaco avesse lo stesso campo, questo
// componente funziona senza modifiche.
export function CalcolatoreInfusioneManuale({ config, pesoKg }) {
  const idCampo = useId()
  const [doseInput, setDoseInput] = useState('')
  const dose = doseInput.trim() === '' ? null : Number(doseInput)
  const doseValida = Number.isFinite(dose) && dose > 0
  const pesoNoto = pesoKg > 0

  const concentrazioni = Object.entries(config.concentrazioni_mg_ml ?? {})

  return (
    <div className="passo-scheda infusione-manuale">
      <IntestazionePasso titolo="Infusione manuale" />
      {config.descrizione && <p className="infusione-descrizione">{config.descrizione}</p>}

      <div className="infusione-campo">
        <label htmlFor={idCampo}>Dose</label>
        <div className="campo-con-unita">
          <input
            id={idCampo}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="es. 3"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
          />
          <span className="campo-unita">mg/kg/h</span>
        </div>
        {pesoNoto && <p className="infusione-peso">su {pesoKg} kg · peso reale dal profilo</p>}
      </div>

      {!pesoNoto && <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>}

      {pesoNoto && !doseValida && <p className="infusione-suggerimento">Inserisci la dose per vedere i ml/h.</p>}

      {pesoNoto && doseValida && (
        <div className="infusione-risultati" aria-live="polite">
          {concentrazioni.map(([nome, mgMl]) => {
            let risultato = null
            let errore = null
            try {
              risultato = calcolaInfusioneOraria({ pesoKg, concentrazioneMgMl: mgMl, doseMgKgH: dose })
            } catch (e) {
              errore = e.message
            }
            return (
              <div key={nome} className="infusione-riga">
                <div className="infusione-nome">
                  <span className="infusione-nome-testo">{nome}</span>
                  <span className="infusione-conc">{mgMl} mg/ml</span>
                </div>
                {errore ? (
                  <p className="avviso avviso-errore infusione-errore">{errore}</p>
                ) : (
                  <>
                    <p className="infusione-valore">
                      {risultato.mlH} <span>ml/h</span>
                    </p>
                    <p className="infusione-formula">{risultato.formula}</p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
