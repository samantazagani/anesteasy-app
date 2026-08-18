import { useEffect, useState } from 'react'
import pediatriaData from '../../data/pediatria-presidi.json'
import farmaciData from '../../data/farmaci.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { formatEta } from '../lib/etaConversione'
import { risolviPeso } from '../lib/pesoResolver'
import { calcolaDose, formatoRisultato } from '../lib/doseCalculator'
import { selezionaDose } from '../lib/selezioneDose'
import {
  trovaFasciaTuboIOT,
  calcolaTuboIOTFormula,
  calcolaDiametriDisponibili,
  calcolaProfonditaDaDiametro,
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
  calcolaVtPediatrico,
  calcolaIBWPediatricoTraubJohnson,
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
      <SezioneVentilazionePediatrica pesoKg={pesoKg} />
      <SezioneIBWPediatrico calcoloPesi={pediatriaData.calcolo_pesi} altezzaCmProfilo={profile.altezzaCm} />
      <SezionePremedicazione
        titolo="Premedicazione e analgesia pediatrica"
        lista={pediatriaData.premedicazione_analgesia}
        derivati={derivati}
      />
      <SezionePremedicazione titolo="Altri farmaci" lista={pediatriaData.altri_farmaci} derivati={derivati} />
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
        <p className="risultato-primario">{render(riga)}</p>
      ) : (
        <p className="avviso">Nessuna fascia trovata per questa età.</p>
      )}
    </div>
  )
}

function SezionePresidi({ presidi, etaAnni, pesoKg }) {
  const { tubo_iot, sng_of, lama_laringoscopio, lma_per_peso, cvc, catetere_vescicale, defibrillazione } = presidi

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

      <SezioneTuboIOT tuboIot={tubo_iot} sngOf={sng_of} etaAnni={etaAnni} />

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

      <SezioneDefibrillazione defibrillazione={defibrillazione} pesoKg={pesoKg} />
    </div>
  )
}

/**
 * Tubo IOT: sotto i 2 anni resta il lookup diretto in tabella (misure gia' discrete, non
 * serve arrotondare). Sopra i 2 anni le formule danno un diametro grezzo continuo: si
 * mostrano i due diametri commerciali che lo racchiudono (incrementi di 0.5mm) e si lascia
 * scegliere, poi la profondita' e il SNG/OG si ricalcolano dal diametro EFFETTIVAMENTE
 * scelto (piu' accurato della sola stima per eta).
 */
function SezioneTuboIOT({ tuboIot, sngOf, etaAnni }) {
  const rigaTabella = trovaFasciaTuboIOT(tuboIot.tabella_eta, etaAnni)
  const formulaTubo = rigaTabella ? null : calcolaTuboIOTFormula(etaAnni)

  return (
    <div className="presidio">
      <p className="presidio-titolo">Tubo IOT</p>
      {rigaTabella ? (
        <>
          <p className="nota">Tabella per età: {rigaTabella.fascia}</p>
          <p className="risultato-primario">
            Diametro {rigaTabella.diametro_mm} mm · profondità {rigaTabella.profondita_cm} cm al
            labbro
          </p>
        </>
      ) : (
        <>
          <p className="nota">Formula (&gt;2 anni) · stima iniziale per età</p>
          <p className="formula">Profondità orale: {formulaTubo.formulaProfondita}</p>
          <p className="formula">Profondità nasale (alternativa): {formulaTubo.formulaProfonditaNasale}</p>

          <div className="griglia-scelta-tubo">
            {/* Cuffiato per primo/in evidenza: e' il piu' usato in pratica (vedi
                presidi.tubo_iot._ordine nel JSON); non cuffiato resta secondario, in
                genere per i <1-2 anni. */}
            <ScegliDiametroTubo
              etichetta="Cuffiato"
              diametroGrezzoMm={formulaTubo.diametroCuffiatoGrezzo}
              formulaGrezzo={formulaTubo.formulaCuffiato}
              cuffiato={true}
              principale={true}
              incrementoMm={tuboIot.arrotondamento.incremento_mm}
              incrementoFrench={sngOf.arrotondamento.incremento_french}
              etaAnni={etaAnni}
            />
            <ScegliDiametroTubo
              etichetta="Non cuffiato"
              diametroGrezzoMm={formulaTubo.diametroNonCuffiatoGrezzo}
              formulaGrezzo={formulaTubo.formulaNonCuffiato}
              cuffiato={false}
              principale={false}
              incrementoMm={tuboIot.arrotondamento.incremento_mm}
              incrementoFrench={sngOf.arrotondamento.incremento_french}
              etaAnni={etaAnni}
            />
          </div>
        </>
      )}
      <p className="nota">{tuboIot.note}</p>
    </div>
  )
}

function ScegliDiametroTubo({
  etichetta,
  diametroGrezzoMm,
  formulaGrezzo,
  cuffiato,
  principale,
  incrementoMm,
  incrementoFrench,
  etaAnni,
}) {
  const [sceltoMm, setSceltoMm] = useState(null)

  // Nuovo calcolo (cambio eta): la scelta precedente non e' piu' valida, si riparte dal
  // consigliato del nuovo bracket.
  useEffect(() => {
    setSceltoMm(null)
  }, [etaAnni])

  const disponibili = calcolaDiametriDisponibili(diametroGrezzoMm, { incremento: incrementoMm, cuffiato })
  const diametroFinale = sceltoMm ?? disponibili.consigliato
  const profondita = calcolaProfonditaDaDiametro(diametroFinale)
  const sngDisponibili = calcolaDiametriDisponibili(2 * diametroFinale, { incremento: incrementoFrench })

  return (
    <div className={principale ? 'scelta-tubo scelta-tubo-principale' : 'scelta-tubo'}>
      <p className="presidio-titolo">
        {etichetta}
        {principale && <span className="chip chip-accento">più usato</span>}
      </p>
      <p className="risultato-primario">{disponibili.grezzo} mm (calcolato)</p>
      <p className="formula">{formulaGrezzo}</p>

      <div className="chip-scelte">
        {[disponibili.inferiore, disponibili.superiore].map((mm) => (
          <button
            key={mm}
            type="button"
            className={mm === diametroFinale ? 'chip chip-bottone selezionato' : 'chip chip-bottone'}
            onClick={() => setSceltoMm(mm)}
          >
            {mm} mm{mm === disponibili.consigliato ? ' · consigliato' : ''}
          </button>
        ))}
      </div>
      <p className="nota">{disponibili.motivoConsigliato}</p>

      <p className="risultato-primario">{profondita.profonditaCm} cm (profondità, dal diametro scelto)</p>
      <p className="formula">{profondita.formula}</p>

      <p className="nota">
        SNG/OG stimato: {sngDisponibili.inferiore}-{sngDisponibili.superiore} Fr (consigliato{' '}
        {sngDisponibili.consigliato} Fr) — circa 2 × diametro scelto, stesso principio di
        arrotondamento del tubo.
      </p>
    </div>
  )
}

function SezioneDefibrillazione({ defibrillazione, pesoKg }) {
  const jDefibrillazione = pesoKg > 0 ? defibrillazione.defibrillazione_J_kg * pesoKg : null
  const jDefibrillazioneArrotondato = jDefibrillazione !== null ? Math.round(jDefibrillazione) : null

  return (
    <div className="presidio">
      <div className="riga-meta">
        <p className="presidio-titolo">Defibrillazione / cardioversione</p>
        <BadgeVerifica verificato={defibrillazione.verificato} />
      </div>
      {!(pesoKg > 0) ? (
        <p className="avviso">Imposta il peso nel profilo per calcolare i Joule.</p>
      ) : (
        <>
          <p className="risultato-primario">
            Defibrillazione: {jDefibrillazioneArrotondato} J (arrotondato)
          </p>
          <p className="formula">
            {defibrillazione.defibrillazione_J_kg} J/kg × {pesoKg} kg = {formatoNumeroSemplice(jDefibrillazione)} J
            → {jDefibrillazioneArrotondato} J
          </p>
          <p className="nota">
            Cardioversione: {defibrillazione.cardioversione_J_kg} J/kg (primo tentativo poi secondo)
          </p>
        </>
      )}
      <p className="nota">{defibrillazione.arrotondamento}</p>
    </div>
  )
}

function formatoNumeroSemplice(valore) {
  return String(Math.round(valore * 10) / 10)
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
            <p className="risultato-primario">{pesoStimato.pesoKg} kg</p>
            <p className="formula">{pesoStimato.formula}</p>
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
            <p className="risultato-primario">
              {volemia.volMinMl}-{volemia.volMaxMl} ml
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
            <p className="risultato-primario">
              {perdita.perditaMinMl}-{perdita.perditaMaxMl} ml
            </p>
            <p className="formula">{perdita.formula}</p>
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
        {mantenimento && (
          <>
            <p className="risultato-primario">{mantenimento.mlH} ml/h</p>
            <p className="formula">{mantenimento.formula}</p>
          </>
        )}
      </div>

      <div className="presidio">
        <div className="riga-meta">
          <p className="presidio-titolo">Bolo di riempimento</p>
          <BadgeVerifica verificato={fluidi.bolo_riempimento.verificato} />
        </div>
        {bolo && (
          <>
            <p className="risultato-primario">{formatoRisultato(bolo)}</p>
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
        {ipoglicemia && (
          <>
            <p className="risultato-primario">{formatoRisultato(ipoglicemia)}</p>
            <p className="formula">{ipoglicemia.formula}</p>
          </>
        )}
      </div>
    </div>
  )
}

function SezioneVentilazionePediatrica({ pesoKg }) {
  const [mlKg, setMlKg] = useState('7')

  const mlKgN = mlKg.trim() === '' ? null : Number(mlKg)

  let risultato = null
  let errore = null
  if (pesoKg > 0 && mlKgN !== null) {
    try {
      risultato = calcolaVtPediatrico({ pesoKg, mlKg: mlKgN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <div className="riquadro-pediatria">
      <h2>Ventilazione</h2>
      <div className="presidio">
        <p className="presidio-titolo">Volume corrente (Vt)</p>
        {!(pesoKg > 0) && <p className="avviso">Imposta il peso reale nel profilo per calcolare.</p>}
        <label className="campo-numerico">
          ml/kg (tipico 6-8)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={mlKg}
            onChange={(e) => setMlKg(e.target.value)}
          />
        </label>
        {errore && <p className="avviso avviso-errore">{errore}</p>}
        {risultato && (
          <>
            <p className="risultato-primario">{risultato.vtMl} ml</p>
            <p className="formula">{risultato.formula}</p>
          </>
        )}
        <p className="nota">6-8 ml/kg; in ARDS 5-6 ml/kg.</p>
      </div>
    </div>
  )
}

/**
 * IBW pediatrico (Traub-Johnson): strumento ECCEZIONALE, separato dal flusso normale.
 * risolviPeso/pesoResolver in pediatria usa SEMPRE il peso reale (guardia di sicurezza gia'
 * in vigore, vedi memoria di progetto): questo calcolatore non alimenta nessun altro modulo,
 * e' solo una consultazione manuale per i rari casi di bambino obeso in cui puo' servire una
 * stima del peso ideale.
 */
function SezioneIBWPediatrico({ calcoloPesi, altezzaCmProfilo }) {
  const [altezzaCm, setAltezzaCm] = useState('')

  useEffect(() => {
    if (altezzaCmProfilo > 0) setAltezzaCm(String(altezzaCmProfilo))
  }, [altezzaCmProfilo])

  const altezzaN = altezzaCm.trim() === '' ? null : Number(altezzaCm)

  let risultato = null
  let errore = null
  if (altezzaN !== null) {
    try {
      risultato = calcolaIBWPediatricoTraubJohnson(altezzaN)
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <div className="riquadro-pediatria">
      <div className="riga-meta">
        <h2>IBW pediatrico (Traub-Johnson)</h2>
        <BadgeVerifica verificato={calcoloPesi.verificato} />
      </div>
      <p className="avviso avviso-pediatrico">
        Strumento eccezionale: da usare solo in casi selezionati di bambino obeso, non come
        default. Il peso di riferimento per il dosaggio dei farmaci in questo modulo resta
        sempre il peso reale (TBW): questo calcolatore non sostituisce automaticamente
        nulla, è solo una consultazione manuale.
      </p>
      <ul className="lista-riferimento">
        {calcoloPesi.algoritmo.map((passo) => (
          <li key={passo}>{passo}</li>
        ))}
      </ul>
      <div className="presidio">
        <label className="campo-numerico">
          Altezza (cm)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={altezzaCm}
            onChange={(e) => setAltezzaCm(e.target.value)}
          />
        </label>
        {errore && <p className="avviso avviso-errore">{errore}</p>}
        {risultato && (
          <>
            <p className="risultato-primario">{risultato.ibwKg} kg</p>
            <p className="formula">{risultato.formula}</p>
          </>
        )}
        <p className="nota">
          Esempi di riferimento:{' '}
          {calcoloPesi.esempi_IBW_traub.map((e) => `${e.altezza_cm}cm → ${e.IBW_kg_circa}kg`).join(' · ')}
        </p>
      </div>
    </div>
  )
}

function SezionePremedicazione({ titolo, lista, derivati }) {
  return (
    <div className="riquadro-pediatria">
      <h2>{titolo}</h2>
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
                  <p className="risultato-primario">{formatoRisultato(risultato)}</p>
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
                  <p className="risultato-primario">{formatoRisultato(risultato)}</p>
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
