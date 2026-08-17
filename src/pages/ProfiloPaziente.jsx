import { useState } from 'react'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaEtaDecimale } from '../lib/etaConversione'
import '../App.css'

export function ProfiloPaziente() {
  const { profile, setProfile, resetProfile, bmi, ibw, lbw } = usePatientProfile()

  // Il profilo lavora sempre in anni decimali (profile.eta): anni e mesi qui sono due
  // campi sempre disponibili e sommati (mesi vuoto conta come 0), utile per un'eta sotto
  // i 3 anni dove "anni decimali" (es. 0.6666...) e' poco leggibile e poco pratico da
  // inserire. Stato locale (non derivato da profile.eta) per non far "saltare" i campi
  // mentre si digita; resta comunque l'unico punto che scrive profile.eta.
  const [anniInput, setAnniInput] = useState('')
  const [mesiInput, setMesiInput] = useState('')

  function ricalcolaEta(anniTesto, mesiTesto) {
    if (anniTesto.trim() === '' && mesiTesto.trim() === '') {
      setProfile({ eta: null })
      return
    }
    const anni = anniTesto.trim() === '' ? 0 : Number(anniTesto)
    const mesi = mesiTesto.trim() === '' ? 0 : Number(mesiTesto)
    setProfile({ eta: calcolaEtaDecimale(anni, mesi) })
  }

  function handleAnniChange(testo) {
    setAnniInput(testo)
    ricalcolaEta(testo, mesiInput)
  }

  function handleMesiChange(testo) {
    setMesiInput(testo)
    ricalcolaEta(anniInput, testo)
  }

  function handleReset() {
    resetProfile()
    setAnniInput('')
    setMesiInput('')
  }

  return (
    <section id="profilo-paziente">
      <h1>Profilo paziente</h1>
      <p className="disclaimer">
        Strumento di supporto, non sostituisce il giudizio clinico. Verificare ogni dose
        prima della somministrazione. Nessun dato paziente viene salvato: il profilo vive
        solo in questa sessione.
      </p>

      <form onSubmit={(e) => e.preventDefault()}>
        <label>
          Sesso
          <select
            value={profile.sesso ?? ''}
            onChange={(e) => setProfile({ sesso: e.target.value || null })}
          >
            <option value="">-</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </label>

        <div className="eta-input">
          <label className="eta-campo">
            Anni
            <input
              type="number"
              min="0"
              step="1"
              value={anniInput}
              onChange={(e) => handleAnniChange(e.target.value)}
            />
          </label>
          <label className="eta-campo">
            Mesi
            <input
              type="number"
              min="0"
              max="11"
              step="1"
              value={mesiInput}
              onChange={(e) => handleMesiChange(e.target.value)}
            />
          </label>
        </div>

        <label>
          Peso (kg)
          <input
            type="number"
            min="0"
            step="0.1"
            value={profile.pesoKg ?? ''}
            onChange={(e) => setProfile({ pesoKg: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>

        <label>
          Altezza (cm)
          <input
            type="number"
            min="0"
            step="1"
            value={profile.altezzaCm ?? ''}
            onChange={(e) => setProfile({ altezzaCm: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>

        <button type="button" onClick={handleReset}>
          Azzera profilo
        </button>
      </form>

      <dl id="derivati">
        <div>
          <dt>BMI</dt>
          <dd>{bmi ?? '—'}</dd>
        </div>
        <div>
          <dt>IBW (peso ideale)</dt>
          <dd>{ibw ?? '—'} kg</dd>
        </div>
        <div>
          <dt>LBW (peso magro)</dt>
          <dd>{lbw ?? '—'} kg</dd>
        </div>
      </dl>
    </section>
  )
}
