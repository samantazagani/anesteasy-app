import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { etaFertileEuristica } from '../lib/ostetriciaSblocco'
import { LABEL_CATEGORIA, righeProfilo } from '../lib/profiloFormat'
import { Icona } from './Icona.jsx'
import './Navigazione.css'

// Riepilogo del profilo sempre visibile nel menu. Legge lo stesso stato condiviso del
// Profilo paziente, quindi si aggiorna in tempo reale mentre si digitano i valori.
export function PannelloPaziente({ onModifica }) {
  const { profile, bmi } = usePatientProfile()
  const righe = righeProfilo(profile, bmi)
  const categoria = categoriaEta(profile.eta)
  const ostetricia = etaFertileEuristica(profile.sesso, profile.eta)

  return (
    <section className="pannello-paziente" aria-label="Paziente">
      <div className="paziente-riga">
        <span className="paziente-avatar">
          <Icona nome="profilo" size={20} />
        </span>
        <div className="paziente-testi">
          {righe ? (
            <>
              <p className="paziente-riga1">{righe.riga1 || '—'}</p>
              {righe.riga2 && <p className="paziente-riga2">{righe.riga2}</p>}
            </>
          ) : (
            <>
              <p className="paziente-riga1">Profilo non impostato</p>
              <p className="paziente-riga2">Inserisci sesso, età, peso e altezza</p>
            </>
          )}
        </div>
      </div>

      <div className="paziente-azioni">
        {categoria && <span className="badge badge-accent">{LABEL_CATEGORIA[categoria]}</span>}
        {ostetricia && <span className="badge badge-success">Ostetricia sbloccata</span>}
        <button type="button" className="link-bottone" onClick={onModifica}>
          Modifica
        </button>
      </div>
    </section>
  )
}
