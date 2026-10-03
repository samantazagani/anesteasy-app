import { useEffect, useMemo, useState } from 'react'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import {
  FIGURA,
  RITAGLIO_FIGURA,
  ZONE,
  costruisciMappa,
  descrizioneBlocco,
  etichettaRegione,
  noteRegioni,
  regioneDellaZona,
  regioniRaggiungibili,
  sessoDaProfilo,
  suggerisciBlocchi,
  testoCopertura,
} from '../lib/mappaBlocchi'
import './MappaBlocchi.css'

const SESSI = [
  ['uomo', 'Uomo'],
  ['donna', 'Donna'],
]
const VISTE = [
  ['anteriore', 'Anteriore'],
  ['posteriore', 'Posteriore'],
]

function Segmentato({ etichetta, opzioni, valore, onCambia }) {
  return (
    <div className="mappa-seg" role="group" aria-label={etichetta}>
      <span className="mappa-seg-etichetta">{etichetta}</span>
      {opzioni.map(([id, testo]) => (
        <button key={id} type="button" aria-pressed={valore === id} onClick={() => onCambia(id)}>
          {testo}
        </button>
      ))}
    </div>
  )
}

function Avvisi({ note }) {
  return note.map((testo) => (
    <div className="mappa-avviso" key={testo}>
      ⚠️ {testo}
    </div>
  ))
}

function Risultato({ mappa, selezione }) {
  if (selezione.length === 0) {
    return (
      <p className="mappa-vuoto">
        Tocca una regione sulla figura. Selezionane più di una per il blocco (o la combinazione)
        che le copre.
      </p>
    )
  }

  const note = noteRegioni(mappa, selezione)

  if (selezione.length === 1) {
    const regione = mappa.regioni[selezione[0]]
    return (
      <>
        <p className="mappa-gruppo">
          Blocchi indicati <span className="mappa-suggerimento">(cosa copre ciascuno)</span>
        </p>
        <div className="mappa-blocchi">
          {regione.blocchi.map((nome) => (
            <div className="mappa-blocco" key={nome}>
              <span className="mappa-chip">{nome}</span>
              <span className="mappa-copertura">
                {descrizioneBlocco(mappa, nome) || `copre: ${testoCopertura(mappa, nome)}`}
              </span>
            </div>
          ))}
        </div>
        <Avvisi note={note} />
        <p className="mappa-gruppo">Interventi tipici</p>
        <ul className="mappa-interventi">
          {regione.chirurgie.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </>
    )
  }

  const { chosen, uncovered } = suggerisciBlocchi(selezione, mappa)
  const singolo = chosen.length === 1 && uncovered.length === 0

  return (
    <>
      {singolo ? (
        <>
          <p className="mappa-gruppo mappa-gruppo-ok">✓ Un solo blocco copre tutte le regioni selezionate</p>
          <div className="mappa-blocchi">
            <div className="mappa-blocco">
              <span className="mappa-chip mappa-chip-ok">{chosen[0].name}</span>
              <span className="mappa-copertura">{descrizioneBlocco(mappa, chosen[0].name)}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mappa-gruppo">Combinazione minima per coprire tutte le regioni</p>
          <div className="mappa-blocchi">
            {chosen.map((c) => (
              <div className="mappa-blocco" key={c.name}>
                <span className="mappa-chip mappa-chip-ok">{c.name}</span>
                <span className="mappa-copertura">
                  copre: <b>{c.copre.map((r) => etichettaRegione(mappa, r)).join(', ')}</b>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {uncovered.length > 0 && (
        <div className="mappa-avviso">
          ⚠️ Nessun blocco singolo copre:{' '}
          <b>{uncovered.map((r) => etichettaRegione(mappa, r)).join(', ')}</b> — valuta anestesia
          generale o approccio dedicato.
        </div>
      )}
      <Avvisi note={note} />
    </>
  )
}

// Mappa dei blocchi: l'utente tocca una o piu' regioni sulla figura e l'app indica il blocco
// che le copre o la combinazione minima. Dati e logica: data/anestetici-locali.json e
// lib/mappaBlocchi.js. Qui solo l'interfaccia.
export function MappaBlocchi({ dati }) {
  const { profile } = usePatientProfile()
  const mappa = useMemo(() => costruisciMappa(dati), [dati])
  const sessoProfilo = sessoDaProfilo(profile.sesso)
  const [sesso, setSesso] = useState(sessoProfilo ?? 'uomo')
  const [vista, setVista] = useState('anteriore')
  const [selezione, setSelezione] = useState([])

  // La figura segue il sesso del profilo paziente; resta modificabile qui sopra senza toccare il
  // profilo (come nei calcolatori di Ventilazione). Si riallinea solo quando il profilo cambia.
  useEffect(() => {
    if (!sessoProfilo) return
    setSesso(sessoProfilo)
    setSelezione((s) => s.filter((r) => regioniRaggiungibili(sessoProfilo, vista).has(r)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessoProfilo])

  function cambia(nuovoSesso, nuovaVista) {
    setSesso(nuovoSesso)
    setVista(nuovaVista)
    const raggiungibili = regioniRaggiungibili(nuovoSesso, nuovaVista)
    setSelezione((s) => s.filter((r) => raggiungibili.has(r)))
  }

  function alterna(id) {
    setSelezione((s) => (s.includes(id) ? s.filter((r) => r !== id) : [...s, id]))
  }

  const R = RITAGLIO_FIGURA

  return (
    <div className="mappa-blocchi-vista">
      <div className="mappa-controlli">
        <Segmentato etichetta="Paziente" opzioni={SESSI} valore={sesso} onCambia={(s) => cambia(s, vista)} />
        <Segmentato etichetta="Vista" opzioni={VISTE} valore={vista} onCambia={(v) => cambia(sesso, v)} />
      </div>
      {sessoProfilo && (
        <p className="nota mappa-nota-profilo">
          La figura segue il sesso del profilo paziente. Puoi cambiarla qui senza modificare il profilo.
        </p>
      )}

      <div className="mappa-layout">
        <figure className="mappa-figura">
          <svg
            viewBox={`${R.x} ${R.y} ${R.larghezza} ${R.altezza}`}
            role="group"
            aria-label={`Paziente ${sesso}, vista ${vista}: regioni selezionabili`}
          >
            <image
              href={`${import.meta.env.BASE_URL}fig/${sesso}-${vista}.webp`}
              x="0"
              y="0"
              width={FIGURA.larghezza}
              height={FIGURA.altezza}
              aria-hidden="true"
            />
            {ZONE.map((zona, i) => {
              const regione = regioneDellaZona(zona, sesso, vista)
              if (!regione) return null
              const attiva = selezione.includes(regione)
              return (
                <rect
                  key={i}
                  className={attiva ? 'mappa-zona attiva' : 'mappa-zona'}
                  x={zona.x}
                  y={zona.y}
                  width={zona.w}
                  height={zona.h}
                  tabIndex={0}
                  role="button"
                  aria-label={etichettaRegione(mappa, regione)}
                  aria-pressed={attiva}
                  onClick={() => alterna(regione)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      alterna(regione)
                    }
                  }}
                />
              )
            })}
          </svg>
          <figcaption>
            Vista {vista} · {sesso}
          </figcaption>
        </figure>

        <section className="mappa-pannello" aria-live="polite">
          <div className="mappa-pannello-testa">
            <h2>Regioni selezionate</h2>
            {selezione.length > 0 && (
              <button type="button" className="mappa-pulisci" onClick={() => setSelezione([])}>
                Pulisci
              </button>
            )}
          </div>
          {selezione.length > 0 && (
            <div className="mappa-selezionate">
              {selezione.map((id) => (
                <span className="mappa-selezionata" key={id}>
                  {etichettaRegione(mappa, id)}
                  <button type="button" aria-label={`Rimuovi ${etichettaRegione(mappa, id)}`} onClick={() => alterna(id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <Risultato mappa={mappa} selezione={selezione} />
        </section>
      </div>
    </div>
  )
}
