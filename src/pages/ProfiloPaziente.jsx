import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import '../App.css'

export function ProfiloPaziente() {
  const { profile, setProfile, resetProfile, bmi, ibw, lbw } = usePatientProfile()

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
          Età (anni)
          <input
            type="number"
            min="0"
            value={profile.eta ?? ''}
            onChange={(e) => setProfile({ eta: e.target.value === '' ? null : Number(e.target.value) })}
          />
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
