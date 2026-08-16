import { useState } from 'react'
import punteggiData from '../../data/punteggi.json'
import {
  calcolaStopBang,
  calcolaRCRI,
  calcolaApfel,
  calcolaGCS,
  calcolaCamIcu,
  calcolaROX,
  calcolaAldrete,
  calcolaFour,
} from '../lib/punteggiCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Punteggi.css'

const CATEGORIE = [
  { id: 'vie_aeree', label: 'Vie aeree' },
  { id: 'preop_perioperatorio', label: 'Preoperatorio / Perioperatorio' },
  { id: 'terapia_intensiva', label: 'Terapia intensiva' },
]

function trova(id) {
  return punteggiData.punteggi.find((p) => p.id === id)
}

function numero(testo) {
  if (typeof testo !== 'string' || testo.trim() === '') return null
  const n = Number(testo)
  return Number.isFinite(n) ? n : null
}

function Campo({ etichetta, valore, onChange, ...props }) {
  return (
    <label className="campo-numerico">
      {etichetta}
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  )
}

function Punteggio({ titolo, children }) {
  return (
    <div className="riquadro-punteggio">
      <div className="riga-meta">
        <p className="punteggio-titolo">{titolo}</p>
        <BadgeVerifica verificato={false} />
      </div>
      {children}
    </div>
  )
}

export function Punteggi() {
  const [categoria, setCategoria] = useState('vie_aeree')

  return (
    <section id="punteggi">
      <h1>Punteggi</h1>
      <p className="sottotitolo">
        Vie aeree, preoperatorio/perioperatorio e terapia intensiva (data/punteggi.json).
      </p>

      <nav className="categorie-p" role="tablist" aria-label="Categoria">
        {CATEGORIE.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === categoria}
            className={c.id === categoria ? 'categoria-item selezionato' : 'categoria-item'}
            onClick={() => setCategoria(c.id)}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <div hidden={categoria !== 'vie_aeree'}>
        <CalcClassificazione dati={trova('mallampati')} opzioni={trova('mallampati').classi} chiaveLabel="classe" chiaveDescrizione="descrizione" />
        <CalcNonCalcolabile dati={trova('el-ganzouri')} />
        <ChecklistPunteggio dati={trova('stop-bang')} calcola={calcolaStopBang} />
      </div>

      <div hidden={categoria !== 'preop_perioperatorio'}>
        <CalcClassificazione dati={trova('mrc-dispnea')} opzioni={trova('mrc-dispnea').gradi} chiaveLabel="grado" chiaveDescrizione="descrizione" />
        <ChecklistPunteggio dati={trova('rcri')} calcola={calcolaRCRI} />
        <CalcNonCalcolabile dati={trova('ariscat')} />
        <CalcMets dati={trova('mets')} />
        <ChecklistPunteggio dati={trova('apfel')} calcola={calcolaApfel} />
        <CalcAldrete dati={trova('aldrete')} />
      </div>

      <div hidden={categoria !== 'terapia_intensiva'}>
        <CalcGCS dati={trova('gcs')} />
        <CalcRASS dati={trova('rass')} />
        <CalcCamIcu dati={trova('cam-icu')} />
        <CalcNonCalcolabile dati={trova('sofa')} />
        <CalcNonCalcolabile dati={trova('apache2')} />
        <CalcFour dati={trova('four')} />
        <CalcNonCalcolabile dati={trova('hacor')} />
        <CalcROX dati={trova('rox')} />
      </div>
    </section>
  )
}

// --- Blocchi generici --------------------------------------------------------------------

/** STOP-BANG, RCRI, Apfel: stessa forma (voci "1 punto ciascuno", calcola(selezionati)). */
function ChecklistPunteggio({ dati, calcola }) {
  const [selezionati, setSelezionati] = useState(() => dati.voci.map(() => false))

  function toggle(i) {
    setSelezionati((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  const risultato = calcola(selezionati)

  return (
    <Punteggio titolo={dati.nome}>
      <div className="checklist-punteggio">
        {dati.voci.map((voce, i) => (
          <label key={voce} className={selezionati[i] ? 'voce-riga voce-attiva' : 'voce-riga'}>
            <input type="checkbox" checked={selezionati[i]} onChange={() => toggle(i)} />
            {voce}
          </label>
        ))}
      </div>
      <p className="risultato-evidenza-p">
        → {risultato.punteggio}/{dati.voci.length} — {risultato.interpretazione}
      </p>
    </Punteggio>
  )
}

/** Mallampati, MRC dispnea: selettore di classificazione, senza somma. */
function CalcClassificazione({ dati, opzioni, chiaveLabel, chiaveDescrizione }) {
  const [indice, setIndice] = useState(0)
  const opzione = opzioni[indice]

  return (
    <Punteggio titolo={dati.nome}>
      <label className="campo-numerico">
        Classe / grado
        <select value={indice} onChange={(e) => setIndice(Number(e.target.value))}>
          {opzioni.map((o, i) => (
            <option key={i} value={i}>
              {o[chiaveLabel]} — {o[chiaveDescrizione]}
            </option>
          ))}
        </select>
      </label>
      <p className="risultato-evidenza-p">
        → {opzione[chiaveLabel]}: {opzione[chiaveDescrizione]}
      </p>
      {dati.interpretazione && <p className="nota">{dati.interpretazione}</p>}
    </Punteggio>
  )
}

/** El-Ganzouri, ARISCAT, SOFA, APACHE II, HACOR: solo elenco voci, nessun punteggio inventato. */
function CalcNonCalcolabile({ dati }) {
  const voci = dati.voci ?? dati.componenti

  return (
    <Punteggio titolo={dati.nome}>
      <p className="avviso avviso-dati-mancanti">
        Punteggio non calcolabile: soglie non ancora definite nel JSON.
      </p>
      {voci && (
        <ul className="lista-riferimenti">
          {voci.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      )}
      {dati.interpretazione && <p className="nota">Interpretazione di riferimento: {dati.interpretazione}</p>}
      {dati.nota && <p className="nota">{dati.nota}</p>}
    </Punteggio>
  )
}

function CalcMets({ dati }) {
  return (
    <Punteggio titolo={dati.nome}>
      <ul className="lista-riferimenti">
        {dati.riferimenti.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="nota">{dati.interpretazione}</p>
    </Punteggio>
  )
}

/** Aldrete, FOUR: il JSON da' solo il range per voce, non le descrizioni dei livelli. */
function CalcManuale({ dati, voci, max, calcola, unitaMassima, interpretaEtichetta }) {
  const [punteggi, setPunteggi] = useState(() => voci.map(() => 0))

  function aggiorna(i, v) {
    setPunteggi((prev) => prev.map((p, idx) => (idx === i ? v : p)))
  }

  let risultato = null
  let errore = null
  try {
    risultato = calcola(punteggi)
  } catch (e) {
    errore = e.message
  }

  return (
    <Punteggio titolo={dati.nome}>
      <p className="avviso avviso-dati-mancanti">
        Descrizioni dei livelli non ancora fornite nel JSON: inserisci il punteggio (0-{max})
        per ciascuna voce in base al giudizio clinico.
      </p>
      <div className="griglia-campi-p">
        {voci.map((voce, i) => (
          <label key={voce} className="campo-numerico">
            {voce} (0-{max})
            <select value={punteggi[i]} onChange={(e) => aggiorna(i, Number(e.target.value))}>
              {Array.from({ length: max + 1 }, (_, v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <p className="risultato-evidenza-p">
          → {risultato.punteggio}/{unitaMassima}
          {interpretaEtichetta ? ` — ${interpretaEtichetta(risultato)}` : ''}
        </p>
      )}
    </Punteggio>
  )
}

function CalcAldrete({ dati }) {
  return (
    <CalcManuale
      dati={dati}
      voci={dati.voci}
      max={2}
      unitaMassima={dati.voci.length * 2}
      calcola={calcolaAldrete}
      interpretaEtichetta={(r) => (r.dimissibile ? 'dimissibile dalla recovery' : 'non ancora dimissibile')}
    />
  )
}

function CalcFour({ dati }) {
  return <CalcManuale dati={dati} voci={dati.componenti} max={4} unitaMassima={dati.componenti.length * 4} calcola={calcolaFour} />
}

// --- Terapia intensiva: componenti dedicati ---------------------------------------------

function SelectComponente({ etichetta, opzioni, indice, onChange }) {
  return (
    <label className="campo-numerico">
      {etichetta}
      <select value={indice} onChange={(e) => onChange(Number(e.target.value))}>
        {opzioni.map((o, i) => (
          <option key={i} value={i}>
            {o.p} — {o.d}
          </option>
        ))}
      </select>
    </label>
  )
}

function CalcGCS({ dati }) {
  const opz = dati.componenti
  const [iOcchi, setIOcchi] = useState(0)
  const [iVerbale, setIVerbale] = useState(0)
  const [iMotoria, setIMotoria] = useState(0)

  const risultato = calcolaGCS({
    aperturaOcchi: opz.apertura_occhi[iOcchi].p,
    rispostaVerbale: opz.risposta_verbale[iVerbale].p,
    rispostaMotoria: opz.risposta_motoria[iMotoria].p,
  })

  return (
    <Punteggio titolo={dati.nome}>
      <div className="griglia-campi-p">
        <SelectComponente etichetta="Apertura occhi" opzioni={opz.apertura_occhi} indice={iOcchi} onChange={setIOcchi} />
        <SelectComponente etichetta="Risposta verbale" opzioni={opz.risposta_verbale} indice={iVerbale} onChange={setIVerbale} />
        <SelectComponente etichetta="Risposta motoria" opzioni={opz.risposta_motoria} indice={iMotoria} onChange={setIMotoria} />
      </div>
      <p className="risultato-evidenza-p">
        → GCS {risultato.punteggio}/15{risultato.coma ? ' — coma' : ''}
      </p>
      <p className="nota">{dati.interpretazione}</p>
    </Punteggio>
  )
}

function CalcRASS({ dati }) {
  const defaultIndice = dati.scala.findIndex((o) => o.p === 0)
  const [indice, setIndice] = useState(defaultIndice >= 0 ? defaultIndice : 0)
  const opzione = dati.scala[indice]

  return (
    <Punteggio titolo={dati.nome}>
      <label className="campo-numerico">
        Livello
        <select value={indice} onChange={(e) => setIndice(Number(e.target.value))}>
          {dati.scala.map((o, i) => (
            <option key={i} value={i}>
              {o.p >= 0 ? `+${o.p}` : o.p} — {o.d}
            </option>
          ))}
        </select>
      </label>
      <p className="risultato-evidenza-p">
        → RASS {opzione.p >= 0 ? `+${opzione.p}` : opzione.p}: {opzione.d}
      </p>
      {dati.nota && <p className="nota">{dati.nota}</p>}
    </Punteggio>
  )
}

function CalcCamIcu({ dati }) {
  const [criteri, setCriteri] = useState([false, false, false, false])

  function toggle(i) {
    setCriteri((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  const risultato = calcolaCamIcu({
    criterio1: criteri[0],
    criterio2: criteri[1],
    criterio3: criteri[2],
    criterio4: criteri[3],
  })

  return (
    <Punteggio titolo={dati.nome}>
      <div className="checklist-punteggio">
        {dati.criteri.map((c, i) => (
          <label key={c} className={criteri[i] ? 'voce-riga voce-attiva' : 'voce-riga'}>
            <input type="checkbox" checked={criteri[i]} onChange={() => toggle(i)} />
            {c}
          </label>
        ))}
      </div>
      <p className={risultato.positivo ? 'risultato-evidenza-p risultato-positivo' : 'risultato-evidenza-p'}>
        → {risultato.positivo ? 'CAM-ICU positivo (delirium presente)' : 'CAM-ICU negativo'}
      </p>
      <p className="nota">{dati.interpretazione}</p>
    </Punteggio>
  )
}

function CalcROX({ dati }) {
  const [spo2, setSpo2] = useState('')
  const [fiO2, setFiO2] = useState('')
  const [fr, setFr] = useState('')

  let risultato = null
  let errore = null
  const s = numero(spo2)
  const f = numero(fiO2)
  const r = numero(fr)
  if (s !== null && f !== null && r !== null) {
    try {
      risultato = calcolaROX({ spo2: s, fiO2: f, fr: r })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Punteggio titolo={dati.nome}>
      <div className="griglia-campi-p">
        <Campo etichetta="SpO2 (%)" valore={spo2} onChange={setSpo2} />
        <Campo etichetta="FiO2 (frazione 0-1)" valore={fiO2} onChange={setFiO2} />
        <Campo etichetta="FR (atti/min)" valore={fr} onChange={setFr} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="formula">{risultato.formula}</p>
          <p className="risultato-evidenza-p">
            → ROX {risultato.indice} {risultato.successoProbabile ? '(≥4.88)' : '(<4.88)'}
          </p>
        </>
      )}
      <p className="nota">{dati.interpretazione}</p>
    </Punteggio>
  )
}
