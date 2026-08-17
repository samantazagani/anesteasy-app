import { useState } from 'react'
import { calcolaInfusioneOraria } from '../lib/infusionCalculator'
import '../styles/risultato.css'
import './CalcolatoreInfusioneManuale.css'

// Guidato dai dati: le concentrazioni (es. "PPF 1%" -> 10 mg/ml) arrivano da
// farmaco.calcolatore_infusione.concentrazioni_mg_ml in farmaci.json, non sono
// hardcoded qui. Se in futuro un altro farmaco avesse lo stesso campo, questo
// componente funziona senza modifiche.
export function CalcolatoreInfusioneManuale({ config, pesoKg }) {
  const [doseInput, setDoseInput] = useState('')
  const dose = doseInput.trim() === '' ? null : Number(doseInput)
  const doseValida = Number.isFinite(dose) && dose > 0

  const concentrazioni = Object.entries(config.concentrazioni_mg_ml ?? {})

  return (
    <div className="infusione-manuale">
      <h3>Infusione manuale (ml/h)</h3>
      {config.descrizione && <p className="sottotitolo">{config.descrizione}</p>}

      <div className="riga-meta">
        <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg (reale, dal profilo)` : 'non impostato'}</span>
      </div>

      <label className="dose-oraria-label">
        Dose (mg/kg/h)
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="es. 3"
          value={doseInput}
          onChange={(e) => setDoseInput(e.target.value)}
        />
      </label>

      {!(pesoKg > 0) && <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>}
      {pesoKg > 0 && !doseValida && <p className="avviso">Inserisci la dose (mg/kg/h) per calcolare.</p>}

      {pesoKg > 0 && doseValida && (
        <div className="colonne-concentrazione">
          {concentrazioni.map(([nome, mgMl]) => {
            let risultato = null
            let errore = null
            try {
              risultato = calcolaInfusioneOraria({ pesoKg, concentrazioneMgMl: mgMl, doseMgKgH: dose })
            } catch (e) {
              errore = e.message
            }
            return (
              <div key={nome} className="colonna-concentrazione">
                <p className="chip">
                  {nome} ({mgMl} mg/ml)
                </p>
                {errore && <p className="avviso avviso-errore">{errore}</p>}
                {risultato && (
                  <div className="formula-a-vista">
                    <p className="risultato-primario">{risultato.mlH} ml/h</p>
                    <p className="formula">{risultato.formula}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
