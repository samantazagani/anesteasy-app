import { useState } from 'react'
import emergenzeData from '../../data/emergenze.json'
import farmaciData from '../../data/farmaci.json'
import anesteticiData from '../../data/anestetici-locali.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { risolviPeso } from '../lib/pesoResolver'
import { calcolaDose, formatoRisultato } from '../lib/doseCalculator'
import { calcolaConcentrazione, calcolaInfusione } from '../lib/infusionCalculator'
import { calcolaLAST } from '../lib/anestesiaLocaleCalculator'
import { tipoPasso, risolviPassoFarmaco } from '../lib/emergenzaStepEngine'
import { InfoFonte } from '../components/InfoFonte.jsx'
import '../styles/risultato.css'
import './Emergenze.css'

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)', LBW: 'LBW (peso magro)' }

// Etichette leggibili per le chiavi di data/emergenze.json che NodoAzione incontra quando
// un nodo e' una mappa di sotto-nodi invece di una singola azione (vedi NodoAzione sotto).
const LABEL_NODO_RAMIFICATO = {
  primo_step: 'Primo step',
  se_risposta_non_soddisfacente: 'Se risposta non soddisfacente',
  se_inefficace: 'Se inefficace',
}

export function Emergenze() {
  const { profile, bmi, ibw, lbw, abw } = usePatientProfile()
  const emergenze = emergenzeData.emergenze
  const farmaci = farmaciData.farmaci

  const [emergenzaId, setEmergenzaId] = useState(emergenze[0].id)
  const [stepIndex, setStepIndex] = useState(0)

  const emergenza = emergenze.find((e) => e.id === emergenzaId)
  // Le emergenze "algoritmo_ramificato" (tachiaritmie/bradiaritmie peri-arresto) non hanno
  // un array "passi" lineare: passi/passo restano vuoti e inutilizzati in quel ramo di UI.
  const passi = emergenza.passi ?? []
  const passo = passi[stepIndex]

  function selezionaEmergenza(id) {
    setEmergenzaId(id)
    setStepIndex(0)
  }

  const categoria = categoriaEta(profile.eta)
  const derivati = { pesoKg: profile.pesoKg, ibw, lbw, abw, bmi, categoria }
  const ramificato = emergenza.tipo === 'algoritmo_ramificato'

  return (
    <section id="emergenze">
      <div className="banner-emergenza">
        <span className="badge-emergenza">EMERGENZA</span>
        <p>
          {ramificato
            ? 'Segui l\'albero delle decisioni. Non sostituisce il giudizio clinico: verificare ogni dose.'
            : 'Segui i passi in ordine. Non sostituisce il giudizio clinico: verificare ogni dose.'}
        </p>
      </div>

      <h1>Emergenze</h1>

      <div className="lista-emergenze" role="listbox" aria-label="Emergenza">
        {emergenze.map((e) => (
          <button
            key={e.id}
            type="button"
            role="option"
            aria-selected={e.id === emergenzaId}
            className={e.id === emergenzaId ? 'emergenza-item selezionato' : 'emergenza-item'}
            onClick={() => selezionaEmergenza(e.id)}
          >
            {e.titolo}
          </button>
        ))}
      </div>

      {ramificato ? (
        <AlgoritmoRamificato
          key={emergenzaId}
          emergenza={emergenza}
          farmaci={farmaci}
          categoria={categoria}
          derivati={derivati}
        />
      ) : (
        <div className="stepper">
          <div className="riga-meta">
            <h2>{emergenza.titolo}</h2>
          </div>

          <div className="stepper-nav">
            <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
              ← Precedente
            </button>
            <span className="stepper-indice">
              Passo {stepIndex + 1} di {passi.length}
            </span>
            <button
              type="button"
              disabled={stepIndex === passi.length - 1}
              onClick={() => setStepIndex((i) => i + 1)}
            >
              Successivo →
            </button>
          </div>

          <div className="stepper-dots">
            {passi.map((p, i) => (
              <button
                key={p.step}
                type="button"
                aria-label={`Vai al passo ${p.step}`}
                aria-current={i === stepIndex}
                className={i === stepIndex ? 'dot selezionato' : 'dot'}
                onClick={() => setStepIndex(i)}
              />
            ))}
          </div>

          {/* key sull'intero blocco: entrando in un nuovo passo, gli stati locali dei
              sotto-componenti (es. diluizione dell'infusione) ripartono puliti. */}
          <div className="passo-corrente" key={`${emergenzaId}-${stepIndex}`}>
            <p className="passo-azione">{passo.azione}</p>

            {tipoPasso(passo) === 'last' && (
              <PassoLAST lastData={anesteticiData.last} pesoKg={profile.pesoKg} />
            )}

            {tipoPasso(passo) === 'farmaco' && (
              <PassoFarmaco passo={passo} farmaci={farmaci} categoria={categoria} derivati={derivati} />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// --- Algoritmo ramificato (tachiaritmie/bradiaritmie peri-arresto) ----------------------
//
// A differenza del resto di emergenze.json (una sequenza lineare di "passi"), queste 2
// emergenze hanno tipo:"algoritmo_ramificato": valutazione iniziale -> instabile/stabile ->
// sotto-rami (QRS largo/stretto x regolare/irregolare per le tachiaritmie; rischio di
// asistolia si/no per le bradiaritmie). I farmaci citati nel testo di ogni nodo foglia sono
// richiamati per farmaco_id+contesto in un campo "farmaci_rapidi" (aggiunto al JSON in
// questo blocco), MAI dalla tabella farmaci_aritmie: stesso motore (risolviPassoFarmaco +
// calcolaDose) gia' usato per i "passi" lineari, riusando PassoFarmaco cosi' com'e'.

/** Un nodo foglia e' una stringa, un oggetto {azione, farmaci_rapidi?}, o un array di
 * entrambi (es. QRS_largo.irregolare: 2 scenari clinici distinti nello stesso ramo). */
function NodoAzione({ nodo, farmaci, categoria, derivati }) {
  if (nodo === undefined || nodo === null) return null

  if (Array.isArray(nodo)) {
    return (
      <>
        {nodo.map((n, i) => (
          <div className="nodo-ramificato" key={i}>
            <NodoAzione nodo={n} farmaci={farmaci} categoria={categoria} derivati={derivati} />
          </div>
        ))}
      </>
    )
  }

  if (typeof nodo === 'string') {
    return <p className="passo-azione">{nodo}</p>
  }

  // Oggetto SENZA una propria "azione" diretta: e' una mappa di sotto-nodi distinti (es.
  // bradiaritmie > instabilita.SE_INSTABILE = { primo_step, se_risposta_non_soddisfacente },
  // a differenza di tachiaritmie > instabilita.SE_INSTABILE che ha gia' "azione" + "se_inefficace"
  // allo stesso livello). Si rende ciascun sotto-nodo in sequenza, con un'etichetta leggibile.
  if (!('azione' in nodo)) {
    return (
      <>
        {Object.entries(nodo).map(([chiave, sotto]) => (
          <div className="nodo-ramificato" key={chiave}>
            <p className="nota nodo-sotto-titolo">{LABEL_NODO_RAMIFICATO[chiave] ?? chiave}</p>
            <NodoAzione nodo={sotto} farmaci={farmaci} categoria={categoria} derivati={derivati} />
          </div>
        ))}
      </>
    )
  }

  // Un nodo con "azione" puo' avere ANCHE altre chiavi allo stesso livello (es.
  // tachiaritmie > instabilita.SE_INSTABILE = { azione: "Cardioversione...", se_inefficace:
  // {...} }): oltre a azione/farmaci_rapidi si ricorre su ogni chiave restante.
  const { azione, farmaci_rapidi, ...sottoNodi } = nodo

  return (
    <>
      <p className="passo-azione">{azione}</p>
      {farmaci_rapidi?.map((ref, i) => (
        <div className="farmaco-rapido" key={i}>
          {ref.label && <p className="nota farmaco-rapido-label">{ref.label}</p>}
          <PassoFarmaco passo={ref} farmaci={farmaci} categoria={categoria} derivati={derivati} />
        </div>
      ))}
      {Object.entries(sottoNodi).map(([chiave, sotto]) => (
        <div className="nodo-ramificato" key={chiave}>
          <p className="nota nodo-sotto-titolo">{LABEL_NODO_RAMIFICATO[chiave] ?? chiave}</p>
          <NodoAzione nodo={sotto} farmaci={farmaci} categoria={categoria} derivati={derivati} />
        </div>
      ))}
    </>
  )
}

function Checklist({ voci }) {
  return (
    <ul className="checklist-ramificato">
      {voci.map((v) => (
        <li key={v}>{v}</li>
      ))}
    </ul>
  )
}

function SceltaRamo({ opzioni, valore, onChange }) {
  return (
    <div className="scelta-ramo" role="tablist">
      {opzioni.map((o) => (
        <button
          key={o.valore}
          type="button"
          role="tab"
          aria-selected={valore === o.valore}
          className={valore === o.valore ? 'ramo-item selezionato' : 'ramo-item'}
          onClick={() => onChange(o.valore)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AlgoritmoRamificato({ emergenza, farmaci, categoria, derivati }) {
  const [instabile, setInstabile] = useState(null) // null | true | false
  const [qrs, setQrs] = useState(null) // null | 'largo' | 'stretto' (solo tachiaritmie)
  const [ritmo, setRitmo] = useState(null) // null | 'regolare' | 'irregolare'
  const [asistolia, setAsistolia] = useState(null) // null | true | false (solo bradiaritmie)

  const eTachiaritmia = emergenza.SE_STABILE?.valuta === 'durata del QRS'

  return (
    <div className="stepper">
      <div className="riga-meta">
        <h2>{emergenza.titolo}</h2>
      </div>

      <div className="scheda-ramificato">
        <p className="scheda-titolo-ramificato">Valutazione iniziale</p>
        <Checklist voci={emergenza.valutazione_iniziale} />
      </div>

      <div className="scheda-ramificato">
        <p className="scheda-titolo-ramificato">Il paziente è instabile?</p>
        <p className="nota">Segni: {emergenza.instabilita.segni.join(' · ')}</p>
        <SceltaRamo
          opzioni={[
            { valore: true, label: 'Instabile' },
            { valore: false, label: 'Stabile' },
          ]}
          valore={instabile}
          onChange={(v) => {
            setInstabile(v)
            setQrs(null)
            setRitmo(null)
            setAsistolia(null)
          }}
        />
      </div>

      {instabile === true && (
        <div className="scheda-ramificato scheda-ramificato-esito">
          <NodoAzione nodo={emergenza.instabilita.SE_INSTABILE} farmaci={farmaci} categoria={categoria} derivati={derivati} />
        </div>
      )}

      {instabile === false && eTachiaritmia && (
        <div className="scheda-ramificato">
          <p className="scheda-titolo-ramificato">Durata del QRS</p>
          <SceltaRamo
            opzioni={[
              { valore: 'largo', label: 'QRS largo (≥0.12s)' },
              { valore: 'stretto', label: 'QRS stretto (<0.12s)' },
            ]}
            valore={qrs}
            onChange={(v) => {
              setQrs(v)
              setRitmo(null)
            }}
          />

          {qrs && (
            <div className="scelta-ramo-sotto">
              <SceltaRamo
                opzioni={[
                  { valore: 'regolare', label: 'Regolare' },
                  { valore: 'irregolare', label: 'Irregolare' },
                ]}
                valore={ritmo}
                onChange={setRitmo}
              />
            </div>
          )}

          {qrs && ritmo && (
            <div className="scheda-ramificato-esito">
              <NodoAzione
                nodo={emergenza.SE_STABILE[qrs === 'largo' ? 'QRS_largo_>=0.12s' : 'QRS_stretto_<0.12s'][ritmo]}
                farmaci={farmaci}
                categoria={categoria}
                derivati={derivati}
              />
            </div>
          )}
        </div>
      )}

      {instabile === false && !eTachiaritmia && (
        <div className="scheda-ramificato">
          <p className="scheda-titolo-ramificato">Rischio di asistolia?</p>
          <p className="nota">Segni: {emergenza.SE_STABILE.rischio_asistolia.segni.join(' · ')}</p>
          <SceltaRamo
            opzioni={[
              { valore: true, label: 'Sì' },
              { valore: false, label: 'No' },
            ]}
            valore={asistolia}
            onChange={setAsistolia}
          />

          {asistolia !== null && (
            <div className="scheda-ramificato-esito">
              <NodoAzione
                nodo={emergenza.SE_STABILE.rischio_asistolia[asistolia ? 'SE_SI' : 'SE_NO']}
                farmaci={farmaci}
                categoria={categoria}
                derivati={derivati}
              />
            </div>
          )}
        </div>
      )}

      {emergenza.alternative && (
        <div className="scheda-ramificato">
          <p className="scheda-titolo-ramificato">Alternative (riferimento)</p>
          <Checklist voci={emergenza.alternative} />
        </div>
      )}

      {emergenza.nota && <p className="nota">{emergenza.nota}</p>}
    </div>
  )
}

function PassoFarmaco({ passo, farmaci, categoria, derivati }) {
  const { farmaco, doseScelta, fasciaUsata, fallback, motore } = risolviPassoFarmaco(
    passo,
    farmaci,
    categoria,
  )

  if (!farmaco) {
    return (
      <p className="avviso avviso-errore">
        Farmaco "{passo.farmaco_id}" non trovato in farmaci.json.
      </p>
    )
  }
  if (!doseScelta) {
    return (
      <p className="avviso avviso-errore">
        Nessun dosaggio per {farmaco.nome} nel contesto "{passo.contesto}".
      </p>
    )
  }

  if (motore === 'infusione') {
    return <PassoInfusione farmaco={farmaco} doseScelta={doseScelta} pesoKg={derivati.pesoKg} />
  }

  return (
    <PassoBolo
      farmaco={farmaco}
      doseScelta={doseScelta}
      fasciaUsata={fasciaUsata}
      fallback={fallback}
      passo={passo}
      derivati={derivati}
    />
  )
}

function PassoBolo({ farmaco, doseScelta, fasciaUsata, fallback, passo, derivati }) {
  const peso = risolviPeso(doseScelta.peso, derivati)
  const richiedePeso = doseScelta.unita.includes('/kg')

  if (richiedePeso && !(peso.valoreKg > 0)) {
    return (
      <p className="avviso">
        Completa il profilo paziente (peso{peso.chiave !== 'reale' ? ', altezza e sesso' : ''}) per
        calcolare: serve il {LABEL_PESO[peso.chiave] ?? peso.chiave}.
      </p>
    )
  }

  let risultato = null
  let errore = null
  try {
    risultato = calcolaDose(doseScelta, peso.valoreKg)
  } catch (e) {
    errore = e.message
  }

  return (
    <div className="formula-a-vista">
      <div className="riga-meta">
        <span className="chip">{farmaco.nome}</span>
        <span className="chip">
          Fascia età: {fasciaUsata}
          {passo.fascia_eta ? ' (dal passo)' : ' (dal profilo)'}
        </span>
        {peso.chiave && <span className="chip">Peso: {LABEL_PESO[peso.chiave] ?? peso.chiave}</span>}
      </div>

      {fallback && (
        <p className="avviso avviso-pediatrico">
          Nessuna voce dedicata alla fascia richiesta per questo contesto: mostrato il dosaggio
          adulto.
        </p>
      )}

      {peso.pesoPediatricoEscluso && (
        <p className="avviso avviso-pediatrico">
          Questo farmaco richiederebbe il peso {peso.pesoPediatricoEscluso}, non valido su un
          paziente pediatrico (formula per adulti): usato il peso reale.
        </p>
      )}

      {errore && <p className="avviso avviso-errore">{errore}</p>}

      {risultato && (
        <>
          <p className="risultato-primario">
            {formatoRisultato(risultato)}
            <InfoFonte fonte={doseScelta.fonte} pagina={doseScelta.pagina} />
          </p>
          <p className="formula">{risultato.formula}</p>
          {doseScelta.note && <p className="nota">{doseScelta.note}</p>}
        </>
      )}
    </div>
  )
}

function PassoInfusione({ farmaco, doseScelta, pesoKg }) {
  const [mgFarmaco, setMgFarmaco] = useState('')
  const [mlSoluzione, setMlSoluzione] = useState('')
  const [doseInput, setDoseInput] = useState(String(doseScelta.valore ?? doseScelta.min ?? ''))

  const mg = mgFarmaco.trim() === '' ? null : Number(mgFarmaco)
  const ml = mlSoluzione.trim() === '' ? null : Number(mlSoluzione)
  const concentrazione = mg > 0 && ml > 0 ? calcolaConcentrazione(mg, ml) : null
  const dose = doseInput.trim() === '' ? null : Number(doseInput)

  let risultato = null
  let errore = null
  if (pesoKg > 0 && concentrazione > 0 && dose > 0) {
    try {
      risultato = calcolaInfusione({ pesoKg, concentrazioneMcgMl: concentrazione, doseMcgKgMin: dose })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <div className="formula-a-vista">
      <div className="riga-meta">
        <span className="chip">{farmaco.nome} · infusione</span>
        <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg` : 'non impostato'}</span>
      </div>

      {(doseScelta.min !== undefined || doseScelta.valore !== undefined) && (
        <p className="nota">
          Range dato: {doseScelta.min ?? doseScelta.valore}
          {doseScelta.max !== undefined ? `–${doseScelta.max}` : ''} {doseScelta.unita}
        </p>
      )}

      <div className="diluizione">
        <label>
          mg farmaco
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={mgFarmaco}
            onChange={(e) => setMgFarmaco(e.target.value)}
          />
        </label>
        <span className="diluizione-in">in</span>
        <label>
          ml soluzione
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={mlSoluzione}
            onChange={(e) => setMlSoluzione(e.target.value)}
          />
        </label>
      </div>

      <label className="campo-dose-infusione">
        Dose target ({doseScelta.unita})
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={doseInput}
          onChange={(e) => setDoseInput(e.target.value)}
        />
      </label>

      {!(pesoKg > 0) && (
        <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>
      )}
      {pesoKg > 0 && !(concentrazione > 0) && (
        <p className="avviso">Inserisci mg farmaco e ml soluzione per la diluizione.</p>
      )}

      {errore && <p className="avviso avviso-errore">{errore}</p>}

      {risultato && (
        <>
          <p className="risultato-primario">{risultato.mlH} ml/h</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </div>
  )
}

function PassoLAST({ lastData, pesoKg }) {
  let last = null
  if (pesoKg > 0) {
    last = calcolaLAST(lastData, pesoKg)
  }

  return (
    <div className="formula-a-vista">
      <div className="riga-meta">
        <span className="chip">Emulsione lipidica 20% (Intralipid)</span>
      </div>

      {!(pesoKg > 0) && (
        <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>
      )}

      {last && (
        <>
          <p className="nota">Bolo</p>
          <p className="risultato-primario">{last.boloMl} ml</p>
          <p className="formula">{last.formulaBolo}</p>

          <p className="nota">Infusione</p>
          <p className="risultato-primario">{last.infusioneMlH} ml/h</p>
          <p className="formula">{last.formulaInfusione}</p>

          <p className="nota">Ripetizione: {lastData.ripetizione}</p>
        </>
      )}
    </div>
  )
}
