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
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Emergenze.css'

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)', LBW: 'LBW (peso magro)' }

export function Emergenze() {
  const { profile, bmi, ibw, lbw } = usePatientProfile()
  const emergenze = emergenzeData.emergenze
  const farmaci = farmaciData.farmaci

  const [emergenzaId, setEmergenzaId] = useState(emergenze[0].id)
  const [stepIndex, setStepIndex] = useState(0)

  const emergenza = emergenze.find((e) => e.id === emergenzaId)
  const passi = emergenza.passi
  const passo = passi[stepIndex]

  function selezionaEmergenza(id) {
    setEmergenzaId(id)
    setStepIndex(0)
  }

  const categoria = categoriaEta(profile.eta)
  const derivati = { pesoKg: profile.pesoKg, ibw, lbw, bmi, categoria }

  return (
    <section id="emergenze">
      <div className="banner-emergenza">
        <span className="badge-emergenza">EMERGENZA</span>
        <p>Segui i passi in ordine. Non sostituisce il giudizio clinico: verificare ogni dose.</p>
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

      <div className="stepper">
        <div className="riga-meta">
          <h2>{emergenza.titolo}</h2>
          <BadgeVerifica verificato={emergenza.verificato} />
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
    </section>
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
        <BadgeVerifica verificato={doseScelta.verificato} />
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
          <p className="risultato-primario">{formatoRisultato(risultato)}</p>
          <p className="formula">{risultato.formula}</p>
          {doseScelta.note && <p className="nota">{doseScelta.note}</p>}
          {doseScelta.fonte && (
            <p className="fonte">
              Fonte: {doseScelta.fonte}
              {doseScelta.pagina ? `, p. ${doseScelta.pagina}` : ''}
            </p>
          )}
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
        <BadgeVerifica verificato={doseScelta.verificato} />
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
        <BadgeVerifica verificato={lastData.verificato} />
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
