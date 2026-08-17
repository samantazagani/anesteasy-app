import { useState } from 'react'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaConcentrazione, calcolaInfusione, calcolaMlOrariDaConcentrazione } from '../lib/infusionCalculator'
import '../styles/risultato.css'
import './CalcolatoreInfusione.css'

function numeroOnullo(testo) {
  if (testo.trim() === '') return null
  const n = Number(testo)
  return Number.isFinite(n) ? n : null
}

export function CalcolatoreInfusione() {
  const { profile } = usePatientProfile()
  const pesoKg = profile.pesoKg

  // --- Calcolatore 1: γ/kg/min <-> ml/h ---
  const [mgFarmaco, setMgFarmaco] = useState('')
  const [mlSoluzione, setMlSoluzione] = useState('')
  const [modalita, setModalita] = useState('dose') // 'dose' | 'mlh'
  const [doseInput, setDoseInput] = useState('')
  const [mlHInput, setMlHInput] = useState('')

  const mg = numeroOnullo(mgFarmaco)
  const ml = numeroOnullo(mlSoluzione)
  const concentrazione = mg > 0 && ml > 0 ? calcolaConcentrazione(mg, ml) : null

  const valoreGuida = modalita === 'dose' ? numeroOnullo(doseInput) : numeroOnullo(mlHInput)

  let risultato = null
  let erroreCalcolo = null
  const pronto = pesoKg > 0 && concentrazione > 0 && valoreGuida > 0

  if (pronto) {
    try {
      risultato = calcolaInfusione({
        pesoKg,
        concentrazioneMcgMl: concentrazione,
        doseMcgKgMin: modalita === 'dose' ? valoreGuida : undefined,
        mlH: modalita === 'mlh' ? valoreGuida : undefined,
      })
    } catch (e) {
      erroreCalcolo = e.message
    }
  }

  // --- Calcolatore 2: dose oraria -> ml/h (peso-indipendente) ---
  const [mgFarmacoOraria, setMgFarmacoOraria] = useState('')
  const [mlSoluzioneOraria, setMlSoluzioneOraria] = useState('')
  const [doseOrariaInput, setDoseOrariaInput] = useState('')

  const mgOraria = numeroOnullo(mgFarmacoOraria)
  const mlOraria = numeroOnullo(mlSoluzioneOraria)
  const concentrazioneOraria = mgOraria > 0 && mlOraria > 0 ? mgOraria / mlOraria : null
  const doseOraria = numeroOnullo(doseOrariaInput)

  let risultatoOraria = null
  let erroreOraria = null
  if (concentrazioneOraria > 0 && doseOraria > 0) {
    try {
      risultatoOraria = calcolaMlOrariDaConcentrazione({
        concentrazioneMgMl: concentrazioneOraria,
        doseMgOra: doseOraria,
      })
    } catch (e) {
      erroreOraria = e.message
    }
  }

  return (
    <section id="calcolatore-infusione">
      <h1>Infusioni</h1>
      <p className="sottotitolo">
        Due modi per arrivare alla velocità di infusione (ml/h): da una dose target per kg
        di peso, oppure da una dose oraria già nota.
      </p>

      <div className="riquadro-calcolatore">
        <h2>γ/kg/min ↔ ml/h</h2>
        <p className="sottotitolo">
          Converte tra dose target (mcg/kg/min) e velocità di infusione (ml/h) per una
          diluizione qualsiasi: parti da uno dei due valori, l'app calcola l'altro.
        </p>

        <div className="riga-meta">
          <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg (reale, dal profilo)` : 'non impostato'}</span>
        </div>
        {!(pesoKg > 0) && (
          <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>
        )}

        <div className="diluizione">
          <label>
            mg di farmaco
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="es. 4"
              value={mgFarmaco}
              onChange={(e) => setMgFarmaco(e.target.value)}
            />
          </label>
          <span className="diluizione-in">in</span>
          <label>
            ml di soluzione
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="es. 250"
              value={mlSoluzione}
              onChange={(e) => setMlSoluzione(e.target.value)}
            />
          </label>
        </div>

        {concentrazione > 0 && <p className="chip concentrazione-chip">Concentrazione: {concentrazione} mcg/ml</p>}

        <div className="modalita" role="tablist" aria-label="Parti da">
          <button
            type="button"
            role="tab"
            aria-selected={modalita === 'dose'}
            className={modalita === 'dose' ? 'modalita-item selezionato' : 'modalita-item'}
            onClick={() => setModalita('dose')}
          >
            Parto dalla dose (mcg/kg/min)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modalita === 'mlh'}
            className={modalita === 'mlh' ? 'modalita-item selezionato' : 'modalita-item'}
            onClick={() => setModalita('mlh')}
          >
            Parto dalla velocità (ml/h)
          </button>
        </div>

        <div className="risultato-infusione">
          {modalita === 'dose' ? (
            <label>
              Dose target (mcg/kg/min)
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="es. 0.1"
                value={doseInput}
                onChange={(e) => setDoseInput(e.target.value)}
              />
            </label>
          ) : (
            <label>
              Velocità (ml/h)
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="es. 26.25"
                value={mlHInput}
                onChange={(e) => setMlHInput(e.target.value)}
              />
            </label>
          )}

          {!(concentrazione > 0) && (
            <p className="avviso">Inserisci mg di farmaco e ml di soluzione per calcolare la concentrazione.</p>
          )}

          {concentrazione > 0 && !(valoreGuida > 0) && (
            <p className="avviso">
              Inserisci {modalita === 'dose' ? 'la dose target' : 'la velocità di infusione'} per calcolare.
            </p>
          )}

          {erroreCalcolo && <p className="avviso avviso-errore">{erroreCalcolo}</p>}

          {risultato && (
            <div className="formula-a-vista">
              <p className="risultato-primario">
                {risultato.direzione === 'dose->mlH'
                  ? `${risultato.mlH} ml/h`
                  : `${risultato.doseMcgKgMin} mcg/kg/min`}
              </p>
              <p className="formula">{risultato.formula}</p>
            </div>
          )}
        </div>
      </div>

      <div className="riquadro-calcolatore">
        <h2>Dose oraria → ml/h</h2>
        <p className="sottotitolo">
          Da una dose oraria assoluta (mg/h) e una diluizione libera, calcola la velocità di
          infusione (ml/h). Non dipende dal peso del paziente.
        </p>

        <div className="diluizione">
          <label>
            mg di farmaco
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="es. 500"
              value={mgFarmacoOraria}
              onChange={(e) => setMgFarmacoOraria(e.target.value)}
            />
          </label>
          <span className="diluizione-in">in</span>
          <label>
            ml di soluzione
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="es. 40"
              value={mlSoluzioneOraria}
              onChange={(e) => setMlSoluzioneOraria(e.target.value)}
            />
          </label>
        </div>

        {concentrazioneOraria > 0 && (
          <p className="chip concentrazione-chip">Concentrazione: {concentrazioneOraria} mg/ml</p>
        )}

        <label className="campo-dose-oraria">
          Dose oraria desiderata (mg/h)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="es. 2"
            value={doseOrariaInput}
            onChange={(e) => setDoseOrariaInput(e.target.value)}
          />
        </label>

        {!(concentrazioneOraria > 0) && (
          <p className="avviso">Inserisci mg di farmaco e ml di soluzione per calcolare la concentrazione.</p>
        )}
        {concentrazioneOraria > 0 && !(doseOraria > 0) && (
          <p className="avviso">Inserisci la dose oraria desiderata per calcolare.</p>
        )}

        {erroreOraria && <p className="avviso avviso-errore">{erroreOraria}</p>}

        {risultatoOraria && (
          <div className="formula-a-vista">
            <p className="risultato-primario">{risultatoOraria.mlH} ml/h</p>
            <p className="formula">{risultatoOraria.formula}</p>
          </div>
        )}
      </div>
    </section>
  )
}
