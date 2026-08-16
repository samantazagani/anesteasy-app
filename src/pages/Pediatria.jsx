import { useState } from 'react'
import pediatriaData from '../../data/pediatria-presidi.json'
import farmaciData from '../../data/farmaci.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { formatEta } from '../lib/etaConversione'
import { risolviPeso } from '../lib/pesoResolver'
import { calcolaDose } from '../lib/doseCalculator'
import { selezionaDose } from '../lib/selezioneDose'
import {
  trovaFasciaTuboIOT,
  calcolaTuboIOTFormula,
  trovaParametriVitali,
  trovaFasciaPerPeso,
  trovaLamaLaringoscopio,
  trovaCvc,
  trovaCatetereVescicale,
  calcolaPesoStimato,
  trovaVolemia,
  calcolaVolemia,
  calcolaPerditaEmaticaMax,
  calcolaMantenimento421,
  doseDaIntervallo,
} from '../lib/pediatriaCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Pediatria.css'

// Le dosi delle emergenze pediatriche non si ridefiniscono qui: si richiama la voce che
// esiste gia' in farmaci.json (fascia_eta: "pediatrico"), una sola fonte di verita' con
// il Modulo 8 Emergenze. Questa mappa collega la "voce" di pediatria-presidi.json al
// farmaco_id + contesto da cercare in farmaci.json.
const MAPPA_EMERGENZE_PEDIATRICHE = {
  'adrenalina arresto': { farmacoId: 'adrenalina', contesto: 'arresto' },
  'atropina bradicardia': { farmacoId: 'atropina', contesto: 'bradicardia' },
  'amiodarone arresto': { farmacoId: 'amiodarone', contesto: 'arresto' },
}

export function Pediatria() {
  const { profile, bmi, ibw, lbw } = usePatientProfile()
  const categoria = categoriaEta(profile.eta)
  const etaAnni = profile.eta
  const pesoKg = profile.pesoKg
  const derivati = { pesoKg, ibw, lbw, bmi, categoria }

  if (categoria !== 'pediatrico') {
    return (
      <section id="pediatria">
        <h1>Pediatria</h1>
        <p className="avviso">
          Questo modulo si attiva per pazienti in età pediatrica (&lt; 18 anni). Imposta l'età
          del paziente nella scheda "Profilo paziente" per usarlo.
        </p>
      </section>
    )
  }

  return (
    <section id="pediatria">
      <h1>Pediatria</h1>
      <div className="riga-meta">
        <span className="chip">Età: {formatEta(etaAnni)}</span>
        <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg (reale)` : 'non impostato'}</span>
        <BadgeVerifica verificato={false} />
      </div>

      <SezionePresidi presidi={pediatriaData.presidi} etaAnni={etaAnni} pesoKg={pesoKg} />
      <SezioneParametriVitali parametriVitali={pediatriaData.parametri_vitali} etaAnni={etaAnni} />
      <SezioneStime stime={pediatriaData.stime} etaAnni={etaAnni} pesoKg={pesoKg} />
      <SezioneFluidi fluidi={pediatriaData.fluidi} pesoKg={pesoKg} />
      <SezionePremedicazione lista={pediatriaData.premedicazione_analgesia} derivati={derivati} />
      <SezioneEmergenzePediatriche
        lista={pediatriaData.emergenze_pediatriche}
        farmaci={farmaciData.farmaci}
        derivati={derivati}
      />
    </section>
  )
}

function PresidioRiga({ titolo, riga, render, avviso }) {
  return (
    <div className="presidio-riga">
      <p className="presidio-titolo">{titolo}</p>
      {avviso ? (
        <p className="avviso">{avviso}</p>
      ) : riga ? (
        <p className="formula">{render(riga)}</p>
      ) : (
        <p className="avviso">Nessuna fascia trovata per questa età.</p>
      )}
    </div>
  )
}

function SezionePresidi({ presidi, etaAnni, pesoKg }) {
  const { tubo_iot, lama_laringoscopio, lma_per_peso, cvc, catetere_vescicale } = presidi

  const rigaTabella = trovaFasciaTuboIOT(tubo_iot.tabella_eta, etaAnni)
  const formulaTubo = rigaTabella ? null : calcolaTuboIOTFormula(etaAnni)

  const lama = trovaLamaLaringoscopio(lama_laringoscopio, etaAnni)
  const lma = pesoKg > 0 ? trovaFasciaPerPeso(lma_per_peso, pesoKg) : null
  const cvcRiga = trovaCvc(cvc, etaAnni)
  const catetere = trovaCatetereVescicale(catetere_vescicale, etaAnni)

  return (
    <div className="riquadro-pediatria">
      <div className="riga-meta">
        <h2>Presidi</h2>
        <BadgeVerifica verificato={tubo_iot.verificato} />
      </div>

      <div className="presidio">
        <p className="presidio-titolo">Tubo IOT</p>
        {rigaTabella ? (
          <>
            <p className="nota">Tabella per età: {rigaTabella.fascia}</p>
            <p className="formula">
              Diametro {rigaTabella.diametro_mm} mm · profondità {rigaTabella.profondita_cm} cm al
              labbro
            </p>
          </>
        ) : (
          <>
            <p className="nota">Formula (&gt;2 anni)</p>
            <p className="formula">{formulaTubo.formulaNonCuffiato} (non cuffiato)</p>
            <p className="formula">{formulaTubo.formulaCuffiato} (cuffiato)</p>
            <p className="formula">{formulaTubo.formulaProfondita} (profondità al labbro)</p>
          </>
        )}
        <p className="nota">{tubo_iot.note}</p>
      </div>

      <div className="griglia-presidi">
        <PresidioRiga
          titolo="Lama laringoscopio"
          riga={lama}
          render={(r) => `${r.tipo} misura ${r.misura}`}
        />
        <PresidioRiga
          titolo="LMA (per peso)"
          riga={lma}
          render={(r) => `Misura ${r.misura}`}
          avviso={!(pesoKg > 0) ? 'Imposta il peso nel profilo.' : null}
        />
        <PresidioRiga
          titolo="CVC"
          riga={cvcRiga}
          render={(r) => `${r.french} Fr, ${r.lunghezza_cm[0]}-${r.lunghezza_cm[1]} cm`}
        />
        <PresidioRiga titolo="Catetere vescicale" riga={catetere} render={(r) => `${r.french} Fr`} />
      </div>
    </div>
  )
}

function SezioneParametriVitali({ parametriVitali, etaAnni }) {
  const riga = trovaParametriVitali(parametriVitali, etaAnni)

  return (
    <div className="riquadro-pediatria">
      <h2>Parametri vitali attesi</h2>
      {riga ? (
        <>
          <p className="nota">Fascia: {riga.fascia}</p>
          <div className="griglia-parametri">
            <div>
              <dt>FC</dt>
              <dd>
                {riga.fc_bpm[0]}-{riga.fc_bpm[1]} bpm
              </dd>
            </div>
            <div>
              <dt>PA sistolica</dt>
              <dd>
                {riga.pa_sistolica_mmHg[0]}-{riga.pa_sistolica_mmHg[1]} mmHg
              </dd>
            </div>
            <div>
              <dt>FR</dt>
              <dd>
                {riga.fr_atti_min[0]}-{riga.fr_atti_min[1]} atti/min
              </dd>
            </div>
          </div>
        </>
      ) : (
        <p className="avviso">Nessuna fascia trovata per questa età.</p>
      )}
    </div>
  )
}

function SezioneStime({ stime, etaAnni, pesoKg }) {
  const [hctIniziale, setHctIniziale] = useState('')
  const [hctMinimo, setHctMinimo] = useState('')

  const pesoStimato = calcolaPesoStimato(etaAnni)
  const pesoPerVolemia = pesoKg > 0 ? pesoKg : (pesoStimato?.pesoKg ?? null)
  const volemiaRow = trovaVolemia(stime.volemia_ml_kg, etaAnni)
  const volemia = calcolaVolemia(volemiaRow, pesoPerVolemia)

  const hctIni = hctIniziale.trim() === '' ? null : Number(hctIniziale)
  const hctMin = hctMinimo.trim() === '' ? null : Number(hctMinimo)

  let perdita = null
  let errorePerdita = null
  if (volemiaRow && pesoPerVolemia > 0 && hctIni !== null && hctMin !== null) {
    try {
      perdita = calcolaPerditaEmaticaMax({
        volemiaRow,
        pesoKg: pesoPerVolemia,
        hctIniziale: hctIni,
        hctMinimo: hctMin,
      })
    } catch (e) {
      errorePerdita = e.message
    }
  }

  return (
    <div className="riquadro-pediatria">
      <div className="riga-meta">
        <h2>Stime</h2>
        <BadgeVerifica verificato={stime.peso_stimato_kg.verificato} />
      </div>

      <div className="presidio">
        <p className="presidio-titolo">Peso stimato</p>
        {pesoStimato ? (
          <>
            <p className="formula">{pesoStimato.formula}</p>
            <p className="risultato-evidenza">→ {pesoStimato.pesoKg} kg</p>
            <p className="nota">
              Alternativa APLS: {pesoStimato.formulaAPLS} → {pesoStimato.pesoAPLS} kg
            </p>
          </>
        ) : (
          <p className="avviso">Formula non disponibile oltre i 12 anni.</p>
        )}
      </div>

      <div className="presidio">
        <p className="presidio-titolo">Volemia stimata</p>
        {volemiaRow && volemia ? (
          <>
            <p className="nota">
              Fascia: {volemiaRow.fascia} · peso usato: {pesoKg > 0 ? 'reale' : 'stimato'}
            </p>
            <p className="formula">{volemia.formula}</p>
          </>
        ) : (
          <p className="avviso">Imposta il peso (o l'età, per la stima) per calcolare.</p>
        )}
      </div>

      <div className="presidio">
        <p className="presidio-titolo">Perdita ematica massima ammissibile</p>
        <div className="griglia-campi-piccola">
          <label className="campo-numerico">
            Hct iniziale (%)
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={hctIniziale}
              onChange={(e) => setHctIniziale(e.target.value)}
            />
          </label>
          <label className="campo-numerico">
            Hct minimo accettabile (%)
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={hctMinimo}
              onChange={(e) => setHctMinimo(e.target.value)}
            />
          </label>
        </div>
        {errorePerdita && <p className="avviso avviso-errore">{errorePerdita}</p>}
        {perdita && (
          <>
            <p className="formula">{perdita.formula}</p>
            <p className="risultato-evidenza">
              → {perdita.perditaMinMl}-{perdita.perditaMaxMl} ml
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function SezioneFluidi({ fluidi, pesoKg }) {
  let mantenimento = null
  let erroreMantenimento = null
  let bolo = null
  let ipoglicemia = null

  if (pesoKg > 0) {
    try {
      mantenimento = calcolaMantenimento421(pesoKg)
    } catch (e) {
      erroreMantenimento = e.message
    }
    bolo = calcolaDose(doseDaIntervallo(fluidi.bolo_riempimento), pesoKg)
    ipoglicemia = calcolaDose(doseDaIntervallo(fluidi.ipoglicemia), pesoKg)
  }

  return (
    <div className="riquadro-pediatria">
      <h2>Fluidi</h2>
      {!(pesoKg > 0) && (
        <p className="avviso">Imposta il peso reale nel profilo paziente per calcolare.</p>
      )}

      <div className="presidio">
        <div className="riga-meta">
          <p className="presidio-titolo">Mantenimento (regola 4-2-1)</p>
          <BadgeVerifica verificato={fluidi.mantenimento_4_2_1.verificato} />
        </div>
        {erroreMantenimento && <p className="avviso avviso-errore">{erroreMantenimento}</p>}
        {mantenimento && <p className="formula">{mantenimento.formula}</p>}
      </div>

      <div className="presidio">
        <div className="riga-meta">
          <p className="presidio-titolo">Bolo di riempimento</p>
          <BadgeVerifica verificato={fluidi.bolo_riempimento.verificato} />
        </div>
        {bolo && (
          <>
            <p className="formula">{bolo.formula}</p>
            <p className="nota">{fluidi.bolo_riempimento.note}</p>
          </>
        )}
      </div>

      <div className="presidio">
        <div className="riga-meta">
          <p className="presidio-titolo">Ipoglicemia</p>
          <BadgeVerifica verificato={fluidi.ipoglicemia.verificato} />
        </div>
        {ipoglicemia && <p className="formula">{ipoglicemia.formula}</p>}
      </div>
    </div>
  )
}

function SezionePremedicazione({ lista, derivati }) {
  return (
    <div className="riquadro-pediatria">
      <h2>Premedicazione e analgesia pediatrica</h2>
      <div className="lista-voci-pediatria">
        {lista.map((farmaco) => {
          const peso = risolviPeso(farmaco.peso, derivati)
          let risultato = null
          let errore = null
          if (peso.valoreKg > 0) {
            try {
              risultato = calcolaDose(farmaco, peso.valoreKg)
            } catch (e) {
              errore = e.message
            }
          }

          return (
            <div key={farmaco.farmaco} className="voce-pediatria">
              <div className="riga-meta">
                <span className="chip chip-capitalizza">{farmaco.farmaco}</span>
                {farmaco.via && <span className="chip">Via: {farmaco.via}</span>}
                <BadgeVerifica verificato={farmaco.verificato} />
              </div>
              {!(peso.valoreKg > 0) && (
                <p className="avviso">Imposta il peso nel profilo per calcolare.</p>
              )}
              {peso.pesoPediatricoEscluso && (
                <p className="avviso avviso-pediatrico">
                  Questo farmaco richiederebbe il peso {peso.pesoPediatricoEscluso}, non valido su un
                  paziente pediatrico: usato il peso reale.
                </p>
              )}
              {errore && <p className="avviso avviso-errore">{errore}</p>}
              {risultato && (
                <>
                  <p className="formula">{risultato.formula}</p>
                  {farmaco.note && <p className="nota">{farmaco.note}</p>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SezioneEmergenzePediatriche({ lista, farmaci, derivati }) {
  return (
    <div className="riquadro-pediatria">
      <h2>Emergenze pediatriche</h2>
      <p className="nota">
        Le dosi non sono ridefinite qui: vengono richiamate da farmaci.json (fascia_eta
        "pediatrico") — stessa fonte del Modulo 8 Emergenze.
      </p>
      <div className="lista-voci-pediatria">
        {lista.map((voce) => {
          const mappa = MAPPA_EMERGENZE_PEDIATRICHE[voce.voce]
          if (!mappa) {
            return (
              <div key={voce.voce} className="voce-pediatria">
                <p className="avviso avviso-errore">Voce "{voce.voce}" non mappata a farmaci.json.</p>
              </div>
            )
          }

          const farmaco = farmaci.find((f) => f.id === mappa.farmacoId)
          const selezione = farmaco
            ? selezionaDose(farmaco.dosi, mappa.contesto, 'pediatrico')
            : { candidati: [], fallback: false }
          const doseScelta = selezione.candidati[0] ?? null

          if (!farmaco || !doseScelta) {
            return (
              <div key={voce.voce} className="voce-pediatria">
                <p className="avviso avviso-errore">
                  {mappa.farmacoId} ({mappa.contesto}): nessuna voce trovata in farmaci.json.
                </p>
              </div>
            )
          }

          const peso = risolviPeso(doseScelta.peso, derivati)
          let risultato = null
          let errore = null
          if (peso.valoreKg > 0) {
            try {
              risultato = calcolaDose(doseScelta, peso.valoreKg)
            } catch (e) {
              errore = e.message
            }
          }

          return (
            <div key={voce.voce} className="voce-pediatria">
              <div className="riga-meta">
                <span className="chip">{farmaco.nome}</span>
                <span className="chip">{mappa.contesto}</span>
                <BadgeVerifica verificato={doseScelta.verificato} />
              </div>
              {selezione.fallback && (
                <p className="avviso avviso-pediatrico">
                  Nessuna voce pediatrica dedicata per {farmaco.nome} ({mappa.contesto}) in
                  farmaci.json: mostrato il dosaggio adulto come riferimento, non idoneo per la
                  prescrizione pediatrica senza verifica clinica.
                </p>
              )}
              {!(peso.valoreKg > 0) && (
                <p className="avviso">Imposta il peso nel profilo per calcolare.</p>
              )}
              {peso.pesoPediatricoEscluso && (
                <p className="avviso avviso-pediatrico">
                  Questo farmaco richiederebbe il peso {peso.pesoPediatricoEscluso}, non valido su un
                  paziente pediatrico: usato il peso reale.
                </p>
              )}
              {errore && <p className="avviso avviso-errore">{errore}</p>}
              {risultato && (
                <>
                  <p className="formula">{risultato.formula}</p>
                  {doseScelta.note && <p className="nota">{doseScelta.note}</p>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
