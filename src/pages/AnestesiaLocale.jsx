import { useEffect, useState } from 'react'
import anesteticiData from '../../data/anestetici-locali.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import {
  calcolaVolumeMassimo,
  calcolaDiluizione,
  calcolaElastomero,
  mgMlDaPercento,
} from '../lib/anestesiaLocaleCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import { TossicitaAdditiva } from '../components/TossicitaAdditiva.jsx'
import { SezioneLAST } from '../components/SezioneLAST.jsx'
import '../styles/risultato.css'
import './AnestesiaLocale.css'

const LABEL_TETTO = { peso: 'dose per kg', assoluto: 'tetto assoluto' }

function trovaPreparazione(anesteticoId) {
  return anesteticiData.preparazioni_commerciali.voci.find((v) => v.anestetico === anesteticoId) ?? null
}

export function AnestesiaLocale() {
  const { profile } = usePatientProfile()
  const anestetici = anesteticiData.anestetici
  const pesoKg = profile.pesoKg

  const [anesteticoId, setAnesteticoId] = useState(anestetici[0].id)
  const [conAdrenalina, setConAdrenalina] = useState(false)
  const [concentrazioneInput, setConcentrazioneInput] = useState('')

  // --- Diluizione da fiala ---
  const [concFiala, setConcFiala] = useState('')
  const [concTargetDil, setConcTargetDil] = useState('')
  const [volumeFinaleDil, setVolumeFinaleDil] = useState('')
  const [volumeFialaDil, setVolumeFialaDil] = useState('')

  // --- Riempimento elastomero ---
  const [concTargetElast, setConcTargetElast] = useState('')
  const [volumeTotaleElast, setVolumeTotaleElast] = useState('')
  const [mgPerFiala, setMgPerFiala] = useState('')
  const [volumeFialaElast, setVolumeFialaElast] = useState('')

  const anestetico = anestetici.find((a) => a.id === anesteticoId) ?? null
  const preparazione = trovaPreparazione(anesteticoId)
  const forme = preparazione?.forme ?? []

  // Ogni cambio di anestetico riparte dalla prima concentrazione commerciale nota
  // (se c'e'), cosi' i calcolatori sotto sono precompilati con valori plausibili.
  useEffect(() => {
    setConcentrazioneInput(forme[0] ? String(forme[0].conc_percento) : '')
    setConcFiala(forme[0] ? String(forme[0].mg_ml) : '')
    setVolumeFialaDil(forme[0]?.volumi_ml?.[0] ? String(forme[0].volumi_ml[0]) : '')
    setMgPerFiala(forme[0] ? String(forme[0].mg_ml * forme[0].volumi_ml[0]) : '')
    setVolumeFialaElast(forme[0]?.volumi_ml?.[0] ? String(forme[0].volumi_ml[0]) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anesteticoId])

  const concentrazionePercento = concentrazioneInput.trim() === '' ? null : Number(concentrazioneInput)

  let volumeMassimo = null
  let erroreVolumeMassimo = null
  if (anestetico && concentrazionePercento > 0 && pesoKg > 0) {
    try {
      volumeMassimo = calcolaVolumeMassimo(anestetico, { conAdrenalina, pesoKg, concentrazionePercento })
    } catch (e) {
      erroreVolumeMassimo = e.message
    }
  }

  let diluizione = null
  let erroreDiluizione = null
  const inputDiluizioneCompleto = concFiala !== '' && concTargetDil !== '' && volumeFinaleDil !== ''
  if (inputDiluizioneCompleto) {
    try {
      diluizione = calcolaDiluizione({
        concFialaMgMl: Number(concFiala),
        concTargetMgMl: Number(concTargetDil),
        volumeFinaleMl: Number(volumeFinaleDil),
        volumeFialaMl: volumeFialaDil === '' ? undefined : Number(volumeFialaDil),
      })
    } catch (e) {
      erroreDiluizione = e.message
    }
  }

  let elastomero = null
  let erroreElastomero = null
  const inputElastomeroCompleto =
    concTargetElast !== '' && volumeTotaleElast !== '' && mgPerFiala !== '' && volumeFialaElast !== ''
  if (inputElastomeroCompleto) {
    try {
      elastomero = calcolaElastomero({
        concTargetMgMl: Number(concTargetElast),
        volumeTotaleMl: Number(volumeTotaleElast),
        mgPerFiala: Number(mgPerFiala),
        volumeFialaMl: Number(volumeFialaElast),
      })
    } catch (e) {
      erroreElastomero = e.message
    }
  }

  const concentrazioniDisponibili = [...new Set(forme.map((f) => f.conc_percento))]

  return (
    <section id="anestesia-locale">
      <h1>Anestetici locali</h1>
      <p className="sottotitolo">
        Volume massimo iniettabile, diluizione, elastomero e tossicita' additiva. Dati BOZZA dal
        Manuale del giovane anestesista, da verificare.
      </p>

      <div className="lista-anestetici" role="listbox" aria-label="Anestetico locale">
        {anestetici.map((a) => (
          <button
            key={a.id}
            type="button"
            role="option"
            aria-selected={a.id === anesteticoId}
            className={a.id === anesteticoId ? 'anestetico-item selezionato' : 'anestetico-item'}
            onClick={() => setAnesteticoId(a.id)}
          >
            {a.nome}
          </button>
        ))}
      </div>

      {anestetico && (
        <>
          <div className="controlli-comuni">
            <label className="toggle-adrenalina">
              <input
                type="checkbox"
                checked={conAdrenalina}
                onChange={(e) => setConAdrenalina(e.target.checked)}
              />
              Con adrenalina
            </label>
            <span className="chip">
              Peso: {pesoKg > 0 ? `${pesoKg} kg (reale, dal profilo)` : 'non impostato'}
            </span>
          </div>
          {!(pesoKg > 0) && (
            <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>
          )}

          {/* --- Volume massimo iniettabile --- */}
          <div className="riquadro-calcolatore" id="volume-massimo">
            <h2>Volume massimo iniettabile</h2>

            <label className="campo-numerico">
              Concentrazione (%)
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="es. 0.5"
                value={concentrazioneInput}
                onChange={(e) => setConcentrazioneInput(e.target.value)}
              />
            </label>
            {concentrazionePercento > 0 && (
              <p className="nota">= {mgMlDaPercento(concentrazionePercento)} mg/ml</p>
            )}
            {concentrazioniDisponibili.length > 0 && (
              <div className="chip-scelte">
                {concentrazioniDisponibili.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="chip chip-bottone"
                    onClick={() => setConcentrazioneInput(String(c))}
                  >
                    {c}%
                  </button>
                ))}
              </div>
            )}

            {erroreVolumeMassimo && <p className="avviso avviso-errore">{erroreVolumeMassimo}</p>}

            {volumeMassimo && (
              <div className="formula-a-vista">
                <div className="riga-meta">
                  <span className="chip">
                    Limitato da: {LABEL_TETTO[volumeMassimo.tettoLimitante]} (
                    {volumeMassimo.tettoLimitante === 'assoluto'
                      ? `${volumeMassimo.tettoAssolutoMg} mg`
                      : `${volumeMassimo.doseMgKg} mg/kg`}
                    )
                  </span>
                  <BadgeVerifica verificato={anestetico.verificato} />
                </div>
                <p className="risultato-primario">{volumeMassimo.volumeMaxMl} ml</p>
                <p className="formula">{volumeMassimo.formula}</p>
                <p className="fonte">
                  Fonte: {anestetico.fonte}
                  {anestetico.pagina ? `, p. ${anestetico.pagina}` : ''}
                </p>
              </div>
            )}
          </div>

          {/* --- Diluizione da fiala --- */}
          <div className="riquadro-calcolatore" id="diluizione">
            <h2>Diluizione da fiala</h2>
            <div className="griglia-campi">
              <label className="campo-numerico">
                Conc. fiala (mg/ml)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={concFiala}
                  onChange={(e) => setConcFiala(e.target.value)}
                />
              </label>
              <label className="campo-numerico">
                Conc. target (mg/ml)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={concTargetDil}
                  onChange={(e) => setConcTargetDil(e.target.value)}
                />
              </label>
              <label className="campo-numerico">
                Volume finale (ml)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={volumeFinaleDil}
                  onChange={(e) => setVolumeFinaleDil(e.target.value)}
                />
              </label>
              <label className="campo-numerico">
                Volume fiala (ml, opzionale)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={volumeFialaDil}
                  onChange={(e) => setVolumeFialaDil(e.target.value)}
                />
              </label>
            </div>

            {erroreDiluizione && <p className="avviso avviso-errore">{erroreDiluizione}</p>}

            {diluizione && (
              <div className="formula-a-vista">
                <p className="risultato-primario">{diluizione.volumeDaPrelevareMl} ml</p>
                <p className="formula">{diluizione.formula}</p>
                {diluizione.fialeNecessarie !== null && (
                  <p className="nota">Fiale necessarie: {diluizione.fialeNecessarie}</p>
                )}
                {diluizione.superaVolumeFiala && (
                  <p className="avviso avviso-errore">
                    Il volume da prelevare supera quello di una singola fiala: servono piu' fiale.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* --- Riempimento elastomero --- */}
          <div className="riquadro-calcolatore" id="elastomero">
            <h2>Riempimento elastomero</h2>
            <div className="griglia-campi">
              <label className="campo-numerico">
                Conc. target (mg/ml)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={concTargetElast}
                  onChange={(e) => setConcTargetElast(e.target.value)}
                />
              </label>
              <label className="campo-numerico">
                Volume totale elastomero (ml)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={volumeTotaleElast}
                  onChange={(e) => setVolumeTotaleElast(e.target.value)}
                />
              </label>
              <label className="campo-numerico">
                mg per fiala
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={mgPerFiala}
                  onChange={(e) => setMgPerFiala(e.target.value)}
                />
              </label>
              <label className="campo-numerico">
                Volume fiala (ml)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={volumeFialaElast}
                  onChange={(e) => setVolumeFialaElast(e.target.value)}
                />
              </label>
            </div>

            {erroreElastomero && <p className="avviso avviso-errore">{erroreElastomero}</p>}

            {elastomero && (
              <div className="formula-a-vista">
                <p className="risultato-primario">
                  {elastomero.nFiale} fiale ({elastomero.volumeALMl} ml AL)
                </p>
                <p className="formula">{elastomero.formula}</p>
                {elastomero.superaVolumeTotale && (
                  <p className="avviso avviso-errore">
                    Il volume di AL calcolato supera il volume totale dell'elastomero: riduci la
                    concentrazione target o aumenta il volume totale.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <TossicitaAdditiva anestetici={anestetici} pesoKg={pesoKg} />

      <SezioneLAST lastData={anesteticiData.last} pesoKg={pesoKg} />
    </section>
  )
}
