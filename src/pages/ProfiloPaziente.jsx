import { useState } from 'react'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { mesiAdAnni, anniAMesi } from '../lib/etaConversione'
import '../App.css'

export function ProfiloPaziente() {
  const { profile, setProfile, resetProfile, bmi, ibw, lbw } = usePatientProfile()

  // Il profilo lavora sempre in anni decimali (profile.eta): l'unita' scelta qui riguarda
  // solo come il numero viene digitato/mostrato, utile sotto i 3 anni dove "anni decimali"
  // (es. 0.6666...) e' poco leggibile e poco pratico da inserire.
  const [unitaEta, setUnitaEta] = useState('anni')

  const etaInputValue =
    profile.eta === null || profile.eta === undefined
      ? ''
      : unitaEta === 'mesi'
        ? String(Math.round(anniAMesi(profile.eta)))
        : String(profile.eta)

  function handleEtaChange(testo) {
    if (testo.trim() === '') {
      setProfile({ eta: null })
      return
    }
    const numero = Number(testo)
    setProfile({ eta: unitaEta === 'mesi' ? mesiAdAnni(numero) : numero })
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

        <label>
          Età
          <div className="eta-input">
            <input
              type="number"
              min="0"
              step="any"
              value={etaInputValue}
              onChange={(e) => handleEtaChange(e.target.value)}
            />
            <div className="unita-eta" role="tablist" aria-label="Unità età">
              <button
                type="button"
                role="tab"
                aria-selected={unitaEta === 'anni'}
                className={unitaEta === 'anni' ? 'unita-eta-item selezionato' : 'unita-eta-item'}
                onClick={() => setUnitaEta('anni')}
              >
                anni
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={unitaEta === 'mesi'}
                className={unitaEta === 'mesi' ? 'unita-eta-item selezionato' : 'unita-eta-item'}
                onClick={() => setUnitaEta('mesi')}
              >
                mesi
              </button>
            </div>
          </div>
        </label>

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

        <button type="button" onClick={resetProfile}>
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
