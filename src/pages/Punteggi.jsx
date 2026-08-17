import { useEffect, useState } from 'react'
import punteggiData from '../../data/punteggi.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import {
  calcolaStopBang,
  calcolaRCRI,
  calcolaApfel,
  calcolaGCS,
  calcolaCamIcu,
  calcolaROX,
  calcolaAldrete,
  calcolaFour,
  calcolaElGanzouri,
  calcolaAriscat,
  calcolaApgar,
  calcolaSofa,
  calcolaHacor,
  calcolaMacocha,
  calcolaParkland,
} from '../lib/punteggiCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Punteggi.css'

const CATEGORIE = [
  { id: 'vie_aeree', label: 'Vie aeree' },
  { id: 'preop_perioperatorio', label: 'Preoperatorio / Perioperatorio' },
  { id: 'terapia_intensiva', label: 'Terapia intensiva' },
  { id: 'neonatale', label: 'Neonatale' },
  { id: 'ustioni', label: 'Ustioni' },
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
  const { profile } = usePatientProfile()
  const [categoria, setCategoria] = useState('vie_aeree')

  return (
    <section id="punteggi">
      <h1>Punteggi</h1>
      <p className="sottotitolo">
        Vie aeree, preoperatorio/perioperatorio, terapia intensiva, neonatale e ustioni
        (data/punteggi.json).
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
        <CalcElGanzouri dati={trova('el-ganzouri')} />
        <ChecklistPunteggio dati={trova('stop-bang')} calcola={calcolaStopBang} />
      </div>

      <div hidden={categoria !== 'preop_perioperatorio'}>
        <CalcClassificazione dati={trova('mrc-dispnea')} opzioni={trova('mrc-dispnea').gradi} chiaveLabel="grado" chiaveDescrizione="descrizione" />
        <ChecklistPunteggio dati={trova('rcri')} calcola={calcolaRCRI} />
        <CalcAriscat dati={trova('ariscat')} />
        <CalcMets dati={trova('mets')} />
        <ChecklistPunteggio dati={trova('apfel')} calcola={calcolaApfel} />
        <CalcAldrete dati={trova('aldrete')} />
        <CalcBromage dati={trova('bromage')} />
      </div>

      <div hidden={categoria !== 'terapia_intensiva'}>
        <CalcGCS dati={trova('gcs')} />
        <CalcRASS dati={trova('rass')} />
        <CalcCamIcu dati={trova('cam-icu')} />
        <CalcSofa dati={trova('sofa')} />
        <CalcFour dati={trova('four')} />
        <CalcHacor dati={trova('hacor')} />
        <CalcROX dati={trova('rox')} />
        <CalcMacocha dati={trova('macocha')} />
      </div>

      <div hidden={categoria !== 'neonatale'}>
        <CalcApgar dati={trova('apgar')} />
      </div>

      <div hidden={categoria !== 'ustioni'}>
        <CalcSuperficieUstionata dati={trova('superficie_ustionata')} pesoKg={profile.pesoKg} />
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
      <p className="risultato-primario">
        {risultato.punteggio}/{dati.voci.length} — {risultato.interpretazione}
      </p>
    </Punteggio>
  )
}

/**
 * Mallampati, MRC dispnea, Bromage: selettore di classificazione, senza somma. chiaveExtra
 * (opzionale) mostra un campo numerico in piu' dell'opzione scelta (es. Bromage:
 * blocco_percent), senza toccare gli altri usi che non lo passano.
 */
function CalcClassificazione({ dati, opzioni, chiaveLabel, chiaveDescrizione, chiaveExtra, extraLabel, extraUnita }) {
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
      <p className="risultato-primario">
        {opzione[chiaveLabel]}: {opzione[chiaveDescrizione]}
        {chiaveExtra && opzione[chiaveExtra] !== undefined
          ? ` (${extraLabel ?? chiaveExtra}: ${opzione[chiaveExtra]}${extraUnita ?? ''})`
          : ''}
      </p>
      {dati.interpretazione && <p className="nota">{dati.interpretazione}</p>}
    </Punteggio>
  )
}

function CalcBromage({ dati }) {
  return (
    <CalcClassificazione
      dati={dati}
      opzioni={dati.gradi}
      chiaveLabel="grado"
      chiaveDescrizione="descrizione"
      chiaveExtra="blocco_percent"
      extraLabel="blocco motorio"
      extraUnita="%"
    />
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

/**
 * El-Ganzouri, ARISCAT, Aldrete, APGAR: stessa forma { voci: [{ parametro, opzioni:[{d,p}]
 * }] }, un select per voce con somma automatica. A differenza di STOP-BANG/RCRI/Apfel i pesi
 * delle opzioni NON sono uniformi (variano voce per voce e opzione per opzione): il punto
 * scelto va sempre letto dall'opzione, mai assunto "1 a voce".
 */
function CalcVociConOpzioni({ dati, calcola, formatRisultato }) {
  const [indici, setIndici] = useState(() => dati.voci.map(() => 0))

  function aggiorna(i, v) {
    setIndici((prev) => prev.map((idx, pos) => (pos === i ? v : idx)))
  }

  const punti = dati.voci.map((voce, i) => voce.opzioni[indici[i]].p)
  const risultato = calcola(punti)

  return (
    <Punteggio titolo={dati.nome}>
      <div className="griglia-campi-p">
        {dati.voci.map((voce, i) => (
          <SelectComponente
            key={voce.parametro}
            etichetta={voce.parametro}
            opzioni={voce.opzioni}
            indice={indici[i]}
            onChange={(v) => aggiorna(i, v)}
          />
        ))}
      </div>
      <p className="risultato-primario">{formatRisultato(risultato)}</p>
      {dati.interpretazione && <p className="nota">{dati.interpretazione}</p>}
    </Punteggio>
  )
}

function CalcElGanzouri({ dati }) {
  return (
    <CalcVociConOpzioni
      dati={dati}
      calcola={calcolaElGanzouri}
      formatRisultato={(r) => `${r.punteggio}/12${r.difficileProbabile ? ' — probabile intubazione difficile' : ''}`}
    />
  )
}

function CalcAriscat({ dati }) {
  return <CalcVociConOpzioni dati={dati} calcola={calcolaAriscat} formatRisultato={(r) => `${r.punteggio} — rischio ${r.rischio}`} />
}

function CalcAldrete({ dati }) {
  return (
    <CalcVociConOpzioni
      dati={dati}
      calcola={calcolaAldrete}
      formatRisultato={(r) => `${r.punteggio}/10${r.dimissibile ? ' — dimissibile dalla recovery' : ' — non ancora dimissibile'}`}
    />
  )
}

function CalcApgar({ dati }) {
  return (
    <CalcVociConOpzioni
      dati={dati}
      calcola={calcolaApgar}
      formatRisultato={(r) => `${r.punteggio}/10${r.richiedeAttenzione ? ' — richiede attenzione/eventuale rianimazione' : ''}`}
    />
  )
}

/**
 * STOP-BANG/RCRI/Apfel/MACOCHA hanno tutte una checklist, ma MACOCHA NON e' "1 punto a
 * voce": ogni voce ha un peso fisso diverso (data/punteggi.json > macocha.voci[].p, es.
 * Mallampati III/IV vale 5) mostrato accanto alla voce, cosi' il peso resta visibile prima
 * ancora di selezionarla.
 */
function ChecklistPunteggioPesato({ dati, calcola }) {
  const [selezionati, setSelezionati] = useState(() => dati.voci.map(() => false))

  function toggle(i) {
    setSelezionati((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  const puntiPerVoce = dati.voci.map((v) => v.p)
  const risultato = calcola(selezionati, puntiPerVoce)

  return (
    <Punteggio titolo={dati.nome}>
      <div className="checklist-punteggio">
        {dati.voci.map((voce, i) => (
          <label key={voce.parametro} className={selezionati[i] ? 'voce-riga voce-attiva' : 'voce-riga'}>
            <input type="checkbox" checked={selezionati[i]} onChange={() => toggle(i)} />
            {voce.parametro}
            <span className="chip">{voce.p} pt</span>
          </label>
        ))}
      </div>
      <p className="risultato-primario">
        {risultato.punteggio} (range {dati.range}){risultato.altoRischio ? ' — alto rischio' : ''}
      </p>
      {dati.interpretazione && <p className="nota">{dati.interpretazione}</p>}
    </Punteggio>
  )
}

function CalcMacocha({ dati }) {
  return <ChecklistPunteggioPesato dati={dati} calcola={calcolaMacocha} />
}

/**
 * GCS, SOFA, FOUR, HACOR: stessa forma { componenti: { chiave: [{d,p}] } }, un select per
 * componente con somma automatica (le chiavi del JSON sono etichette tecniche, es.
 * "respiratorio_PF": l'elenco "componenti" qui sotto associa a ciascuna un'etichetta
 * leggibile, sullo stesso principio delle soglie esplicitate in codice altrove).
 */
function CalcComponentiConSomma({ dati, componenti, calcola, formatRisultato }) {
  const [indici, setIndici] = useState(() => componenti.map(() => 0))

  function aggiorna(i, v) {
    setIndici((prev) => prev.map((idx, pos) => (pos === i ? v : idx)))
  }

  const punti = componenti.map(({ chiave }, i) => dati.componenti[chiave][indici[i]].p)
  const risultato = calcola(punti)

  return (
    <Punteggio titolo={dati.nome}>
      <div className="griglia-campi-p">
        {componenti.map(({ chiave, etichetta }, i) => (
          <SelectComponente
            key={chiave}
            etichetta={etichetta}
            opzioni={dati.componenti[chiave]}
            indice={indici[i]}
            onChange={(v) => aggiorna(i, v)}
          />
        ))}
      </div>
      <p className="risultato-primario">{formatRisultato(risultato)}</p>
      {dati.interpretazione && <p className="nota">{dati.interpretazione}</p>}
    </Punteggio>
  )
}

const COMPONENTI_SOFA = [
  { chiave: 'respiratorio_PF', etichetta: 'Respiratorio (PaO2/FiO2)' },
  { chiave: 'coagulazione_piastrine_x10e3', etichetta: 'Coagulazione (piastrine ×10³/µl)' },
  { chiave: 'fegato_bilirubina_mg_dl', etichetta: 'Fegato (bilirubina mg/dl)' },
  { chiave: 'cardiovascolare', etichetta: 'Cardiovascolare' },
  { chiave: 'snc_GCS', etichetta: 'SNC (GCS)' },
  { chiave: 'rene_creatinina_mg_dl', etichetta: 'Rene (creatinina mg/dl)' },
]

function CalcSofa({ dati }) {
  return (
    <CalcComponentiConSomma dati={dati} componenti={COMPONENTI_SOFA} calcola={calcolaSofa} formatRisultato={(r) => `SOFA ${r.punteggio}/24`} />
  )
}

const COMPONENTI_FOUR = [
  { chiave: 'occhi', etichetta: 'Occhi' },
  { chiave: 'motorio', etichetta: 'Motorio' },
  { chiave: 'riflessi_tronco', etichetta: 'Riflessi del tronco' },
  { chiave: 'respiro', etichetta: 'Respiro' },
]

function CalcFour({ dati }) {
  return (
    <CalcComponentiConSomma dati={dati} componenti={COMPONENTI_FOUR} calcola={calcolaFour} formatRisultato={(r) => `FOUR ${r.punteggio}/16`} />
  )
}

const COMPONENTI_HACOR = [
  { chiave: 'FC', etichetta: 'FC (bpm)' },
  { chiave: 'acidosi_pH', etichetta: 'pH (acidosi)' },
  { chiave: 'coscienza_GCS', etichetta: 'Coscienza (GCS)' },
  { chiave: 'ossigenazione_PF', etichetta: 'Ossigenazione (PaO2/FiO2)' },
  { chiave: 'FR', etichetta: 'FR (atti/min)' },
]

function CalcHacor({ dati }) {
  return (
    <CalcComponentiConSomma
      dati={dati}
      componenti={COMPONENTI_HACOR}
      calcola={calcolaHacor}
      formatRisultato={(r) => `HACOR ${r.punteggio}/27${r.altoRischio ? ' — alto rischio di fallimento NIV' : ''}`}
    />
  )
}

const COMPONENTI_GCS = [
  { chiave: 'apertura_occhi', etichetta: 'Apertura occhi' },
  { chiave: 'risposta_verbale', etichetta: 'Risposta verbale' },
  { chiave: 'risposta_motoria', etichetta: 'Risposta motoria' },
]

function CalcGCS({ dati }) {
  return (
    <CalcComponentiConSomma
      dati={dati}
      componenti={COMPONENTI_GCS}
      calcola={(punti) => calcolaGCS({ aperturaOcchi: punti[0], rispostaVerbale: punti[1], rispostaMotoria: punti[2] })}
      formatRisultato={(r) => `GCS ${r.punteggio}/15${r.coma ? ' — coma' : ''}`}
    />
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
      <p className="risultato-primario">
        RASS {opzione.p >= 0 ? `+${opzione.p}` : opzione.p}: {opzione.d}
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
      <p className={risultato.positivo ? 'risultato-primario risultato-positivo' : 'risultato-primario'}>
        {risultato.positivo ? 'CAM-ICU positivo (delirium presente)' : 'CAM-ICU negativo'}
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
          <p className="risultato-primario">
            ROX {risultato.indice} {risultato.successoProbabile ? '(≥4.88)' : '(<4.88)'}
          </p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">{dati.interpretazione}</p>
    </Punteggio>
  )
}

// --- Ustioni ------------------------------------------------------------------------------

function CalcSuperficieUstionata({ dati, pesoKg }) {
  const [pesoInput, setPesoInput] = useState(pesoKg > 0 ? String(pesoKg) : '')
  const [tbsaInput, setTbsaInput] = useState('')

  useEffect(() => {
    if (pesoKg > 0) setPesoInput(String(pesoKg))
  }, [pesoKg])

  const peso = numero(pesoInput)
  const tbsa = numero(tbsaInput)

  let risultato = null
  let errore = null
  if (peso !== null && tbsa !== null) {
    try {
      risultato = calcolaParkland({ pesoKg: peso, percentTBSA: tbsa })
    } catch (e) {
      errore = e.message
    }
  }

  const regola9 = dati.regola_dei_9_adulto

  return (
    <Punteggio titolo={dati.nome}>
      <p className="scheda-titolo-p">Regola del nove (adulto)</p>
      <ul className="lista-riferimenti">
        <li>Testa/collo: {regola9.testa_collo}%</li>
        <li>Ogni arto superiore: {regola9.ogni_arto_superiore}%</li>
        <li>Torace anteriore: {regola9.torace_anteriore}%</li>
        <li>Dorso: {regola9.dorso}%</li>
        <li>Ogni arto inferiore: {regola9.ogni_arto_inferiore}%</li>
        <li>Genitali: {regola9.genitali}%</li>
      </ul>
      <p className="nota">Bambino: {dati.bambino_differenze}</p>
      <p className="nota">Metodo del palmo: {dati.metodo_del_palmo}</p>

      <p className="scheda-titolo-p">Parkland (fluidi nelle 24h)</p>
      <div className="griglia-campi-p">
        <Campo etichetta="Peso (kg)" valore={pesoInput} onChange={setPesoInput} />
        <Campo etichetta="TBSA (%)" valore={tbsaInput} onChange={setTbsaInput} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.totale24hMl} ml/24h totali</p>
          <p className="formula">{risultato.formula}</p>
          <p className="risultato-primario">{risultato.prime8hMl} ml nelle prime 8h (dall'ustione)</p>
          <p className="risultato-primario">{risultato.successive16hMl} ml nelle 16h successive</p>
        </>
      )}
      <p className="nota">{dati.parkland.note}</p>
    </Punteggio>
  )
}
