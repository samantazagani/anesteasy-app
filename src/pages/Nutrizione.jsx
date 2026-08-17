import { useState } from 'react'
import nutrizioneData from '../../data/nutrizione.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaDose, formatoRisultato } from '../lib/doseCalculator'
import {
  calcolaHarrisBenedict,
  selezionaRegimeCalorico,
  selezionaRegimeProteico,
  pesoDiRiferimento,
  percentualeFaseDefault,
  calcolaTargetCalorico,
  calcolaCaloriePropofol,
  calcolaTargetNetto,
  calcolaProteineTarget,
  calcolaNPT,
  calcolaVolumeComponente,
  criterioBMIRefeeding,
} from '../lib/nutrizioneCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Nutrizione.css'

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)' }
const LABEL_BRACKET_CALORICO = {
  'non_obeso_BMI<30': 'BMI < 30',
  'obeso_BMI_30-50': 'BMI 30-50',
  'obeso_BMI>50': 'BMI > 50',
}
const LABEL_BRACKET_PROTEICO = {
  non_obeso: 'BMI < 30',
  'obeso_BMI_30-40': 'BMI 30-40',
  'obeso_BMI>=40': 'BMI ≥ 40',
}

export function Nutrizione() {
  const { profile, bmi, ibw } = usePatientProfile()
  const pesoKg = profile.pesoKg

  const {
    fabbisogno_calorico: fabbisognoCalorico,
    percentuale_fase: percentualeFaseData,
    proteine,
    propofol_calorie: propofolCalorie,
    fabbisogno_idrico: fabbisognoIdrico,
  } = nutrizioneData

  // --- Passo 1: regime da BMI, calorico e proteico hanno soglie DIVERSE tra loro -------
  const regimeCalorico = selezionaRegimeCalorico(fabbisognoCalorico.regime_per_bmi, bmi)
  const pesoRifCalorico = pesoDiRiferimento(regimeCalorico, { pesoKg, ibw })
  const regimeProteico = selezionaRegimeProteico(proteine.regime_per_bmi, bmi)
  const pesoRifProteico = pesoDiRiferimento(regimeProteico, { pesoKg, ibw })

  // --- Passo 3: fase clinica, percentuale precompilata dalla fase ma sempre modificabile
  const [faseIndice, setFaseIndice] = useState(0)
  const fase = percentualeFaseData.fasi[faseIndice]
  const [percentualeInput, setPercentualeInput] = useState(
    String(percentualeFaseDefault(fase.percentuale_target) ?? ''),
  )

  function selezionaFase(i) {
    setFaseIndice(i)
    setPercentualeInput(String(percentualeFaseDefault(percentualeFaseData.fasi[i].percentuale_target) ?? ''))
  }

  const percentualeFaseN = percentualeInput.trim() === '' ? null : Number(percentualeInput)

  // --- Passo 2-3: target calorico (grezzo e di fase) ------------------------------------
  let targetCalorico = null
  let erroreTargetCalorico = null
  if (regimeCalorico && pesoRifCalorico.valoreKg > 0 && percentualeFaseN > 0) {
    try {
      targetCalorico = calcolaTargetCalorico({
        kcalKgRange: regimeCalorico.kcal_kg,
        pesoRiferimentoKg: pesoRifCalorico.valoreKg,
        percentualeFase: percentualeFaseN,
      })
    } catch (e) {
      erroreTargetCalorico = e.message
    }
  }

  // --- Passo 4: propofol in corso (opzionale) -------------------------------------------
  const [mlHPropofoloInput, setMlHPropofoloInput] = useState('')
  const mlHPropofolo = mlHPropofoloInput.trim() === '' ? null : Number(mlHPropofoloInput)
  let caloriePropofol = null
  let errorePropofol = null
  if (mlHPropofolo > 0) {
    try {
      caloriePropofol = calcolaCaloriePropofol({
        mlH: mlHPropofolo,
        kcalPerMl: propofolCalorie.kcal_per_ml,
        lipidiGPerMl: propofolCalorie.lipidi_g_per_ml,
      })
    } catch (e) {
      errorePropofol = e.message
    }
  }

  // --- Passo 5: target netto (di fase, meno il propofol) --------------------------------
  const targetNetto = targetCalorico
    ? calcolaTargetNetto({ kcalFase: targetCalorico.kcalFase, kcalPropofol: caloriePropofol?.kcalDie ?? 0 })
    : null

  // --- Passo 6: proteine, dal regime BMI, NON scalate dalla fase ------------------------
  let proteineTarget = null
  let erroreProteine = null
  if (regimeProteico && pesoRifProteico.valoreKg > 0) {
    try {
      proteineTarget = calcolaProteineTarget({
        gKg: regimeProteico.g_kg,
        pesoRiferimentoKg: pesoRifProteico.valoreKg,
      })
    } catch (e) {
      erroreProteine = e.message
    }
  }

  return (
    <section id="nutrizione">
      <h1>Nutrizione</h1>
      <div className="riga-meta">
        <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg (reale)` : 'non impostato'}</span>
        <span className="chip">BMI: {bmi !== null && bmi !== undefined ? bmi : 'non disponibile'}</span>
        <BadgeVerifica verificato={false} />
      </div>

      <SezioneFabbisognoCalorico
        fabbisognoCalorico={fabbisognoCalorico}
        regimeCalorico={regimeCalorico}
        pesoRifCalorico={pesoRifCalorico}
        percentualeFaseData={percentualeFaseData}
        faseIndice={faseIndice}
        onFaseChange={selezionaFase}
        percentualeInput={percentualeInput}
        onPercentualeChange={setPercentualeInput}
        targetCalorico={targetCalorico}
        erroreTargetCalorico={erroreTargetCalorico}
        profile={profile}
        pesoKg={pesoKg}
      />

      <SezionePropofol
        propofolCalorie={propofolCalorie}
        mlHInput={mlHPropofoloInput}
        onMlHChange={setMlHPropofoloInput}
        caloriePropofol={caloriePropofol}
        errorePropofol={errorePropofol}
        targetCalorico={targetCalorico}
        targetNetto={targetNetto}
      />

      <SezioneProteine
        proteine={proteine}
        regimeProteico={regimeProteico}
        pesoRifProteico={pesoRifProteico}
        proteineTarget={proteineTarget}
        erroreProteine={erroreProteine}
      />

      <SezioneFabbisognoIdrico dati={fabbisognoIdrico} pesoKg={pesoKg} />

      <SezioneRefeeding dati={nutrizioneData.refeeding_syndrome} bmi={bmi} />

      <SezioneNPT
        dati={nutrizioneData.npt_calcolatore}
        pesoKg={pesoKg}
        targetNetto={targetNetto}
        proteineTarget={proteineTarget}
        lipidiPropofolG={caloriePropofol?.lipidiGDie ?? 0}
      />
    </section>
  )
}

function SezioneFabbisognoCalorico({
  fabbisognoCalorico,
  regimeCalorico,
  pesoRifCalorico,
  percentualeFaseData,
  faseIndice,
  onFaseChange,
  percentualeInput,
  onPercentualeChange,
  targetCalorico,
  erroreTargetCalorico,
  profile,
  pesoKg,
}) {
  const harrisBenedict = fabbisognoCalorico.harris_benedict

  const [sesso, setSesso] = useState(profile.sesso ?? 'M')
  const [fattoreStressInput, setFattoreStressInput] = useState('')
  const fattoreStress = fattoreStressInput.trim() === '' ? undefined : Number(fattoreStressInput)

  let hb = null
  let erroreHb = null
  if (pesoKg > 0 && profile.altezzaCm > 0 && profile.eta >= 0) {
    try {
      hb = calcolaHarrisBenedict({ sesso, pesoKg, altezzaCm: profile.altezzaCm, eta: profile.eta, fattoreStress })
    } catch (e) {
      erroreHb = e.message
    }
  }

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Fabbisogno calorico</h2>
        <BadgeVerifica verificato={fabbisognoCalorico.verificato} />
      </div>

      <div className="scheda">
        <p className="scheda-titolo">Regime (automatico dal BMI)</p>
        {regimeCalorico ? (
          <>
            <div className="riga-meta">
              <span className="chip chip-capitalizza">{regimeCalorico.regime}</span>
              <span className="chip">{LABEL_BRACKET_CALORICO[regimeCalorico.chiave]}</span>
              <span className="chip">
                Peso di riferimento: {LABEL_PESO[pesoRifCalorico.chiave] ?? pesoRifCalorico.chiave}
                {pesoRifCalorico.valoreKg > 0 ? ` (${pesoRifCalorico.valoreKg} kg)` : ''}
              </span>
            </div>
            <p className="nota">
              {regimeCalorico.kcal_kg[0]}-{regimeCalorico.kcal_kg[1]} kcal/kg
              {regimeCalorico.fonte ? ` · fonte: ${regimeCalorico.fonte}` : ''}
            </p>
            {!(pesoRifCalorico.valoreKg > 0) && (
              <p className="avviso avviso-errore">
                Il regime richiede il peso {LABEL_PESO[pesoRifCalorico.chiave] ?? pesoRifCalorico.chiave}, non
                disponibile: completa sesso/peso/altezza nel profilo paziente.
              </p>
            )}
          </>
        ) : (
          <p className="avviso">Imposta peso e altezza nel profilo paziente per determinare il BMI e il regime.</p>
        )}
      </div>

      <div className="scheda">
        <p className="scheda-titolo">Fase clinica</p>
        <div className="fasi-proteine" role="tablist" aria-label="Fase">
          {percentualeFaseData.fasi.map((f, i) => (
            <button
              key={f.fase}
              type="button"
              role="tab"
              aria-selected={i === faseIndice}
              className={i === faseIndice ? 'fase-item selezionato' : 'fase-item'}
              onClick={() => onFaseChange(i)}
            >
              {f.fase}
            </button>
          ))}
        </div>
        <p className="nota">
          Target di riferimento: {percentualeFaseData.fasi[faseIndice].percentuale_target}
          {percentualeFaseData.fasi[faseIndice].motivo ? ` — ${percentualeFaseData.fasi[faseIndice].motivo}` : ''}
        </p>

        <label className="campo-numerico campo-target">
          Percentuale scelta (%)
          <input
            type="number"
            min="0"
            max="200"
            step="any"
            inputMode="decimal"
            value={percentualeInput}
            onChange={(e) => onPercentualeChange(e.target.value)}
          />
        </label>

        {erroreTargetCalorico && <p className="avviso avviso-errore">{erroreTargetCalorico}</p>}
        {targetCalorico && (
          <>
            <p className="nota">Target pieno (100%): {targetCalorico.kcalTarget} kcal/die</p>
            <p className="formula">{targetCalorico.formulaTarget}</p>
            <p className="risultato-primario">{targetCalorico.kcalFase} kcal/die (target di fase)</p>
            <p className="formula">{targetCalorico.formulaFase}</p>
          </>
        )}
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Harris-Benedict</p>
          <BadgeVerifica verificato={harrisBenedict.verificato} />
        </div>

        <div className="griglia-campi-piccola">
          <label className="campo-numerico">
            Sesso
            <select value={sesso} onChange={(e) => setSesso(e.target.value)}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </label>
          <label className="campo-numerico">
            Fattore di stress ({harrisBenedict.fattore_stress})
            <input
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              placeholder="es. 1.3"
              value={fattoreStressInput}
              onChange={(e) => setFattoreStressInput(e.target.value)}
            />
          </label>
        </div>

        {!(pesoKg > 0 && profile.altezzaCm > 0 && profile.eta >= 0) && (
          <p className="avviso">Completa peso, altezza ed età nel profilo paziente per calcolare.</p>
        )}
        {erroreHb && <p className="avviso avviso-errore">{erroreHb}</p>}
        {hb && (
          <>
            <p className="risultato-primario">{hb.basaleKcal} kcal/die (basale)</p>
            <p className="formula">{hb.formulaBasale}</p>
            {hb.formulaStress && (
              <>
                <p className="risultato-primario">{hb.kcalConStress} kcal/die (con stress)</p>
                <p className="formula">{hb.formulaStress}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SezionePropofol({ propofolCalorie, mlHInput, onMlHChange, caloriePropofol, errorePropofol, targetCalorico, targetNetto }) {
  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Propofol in corso</h2>
        <BadgeVerifica verificato={propofolCalorie.verificato} />
      </div>
      <p className="nota">{propofolCalorie.descrizione}</p>

      <label className="campo-numerico campo-target">
        Velocità propofol (ml/h, lasciare vuoto se non in corso)
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="es. 20"
          value={mlHInput}
          onChange={(e) => onMlHChange(e.target.value)}
        />
      </label>

      {errorePropofol && <p className="avviso avviso-errore">{errorePropofol}</p>}

      {caloriePropofol && (
        <>
          <p className="risultato-primario">{caloriePropofol.kcalDie} kcal/die dal propofol</p>
          <p className="formula">{caloriePropofol.formulaKcal}</p>
          <p className="risultato-primario">{caloriePropofol.lipidiGDie} g/die di lipidi dal propofol</p>
          <p className="formula">{caloriePropofol.formulaLipidi}</p>
        </>
      )}

      {targetCalorico && (
        <div className="scheda scheda-sottrazione">
          <p className="scheda-titolo">Target netto da nutrizione</p>
          <p className="nota">Prima (target di fase): {targetCalorico.kcalFase} kcal/die</p>
          <p className="nota">Meno propofol: {caloriePropofol ? `-${caloriePropofol.kcalDie}` : '0'} kcal/die</p>
          {targetNetto && (
            <>
              <p className="risultato-primario">Dopo: {targetNetto.kcalNetto} kcal/die (target netto)</p>
              <p className="formula">{targetNetto.formula}</p>
              {targetNetto.copertoDaPropofol && (
                <p className="avviso avviso-errore">
                  Il propofol da solo copre o supera il target di fase: nessuna caloria aggiuntiva netta da
                  nutrizione (verifica comunque proteine e lipidi totali sotto).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SezioneProteine({ proteine, regimeProteico, pesoRifProteico, proteineTarget, erroreProteine }) {
  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Proteine</h2>
        <BadgeVerifica verificato={proteine.verificato} />
      </div>

      {regimeProteico ? (
        <>
          <div className="riga-meta">
            <span className="chip">{LABEL_BRACKET_PROTEICO[regimeProteico.chiave]}</span>
            <span className="chip">
              Peso di riferimento: {LABEL_PESO[pesoRifProteico.chiave] ?? pesoRifProteico.chiave}
              {pesoRifProteico.valoreKg > 0 ? ` (${pesoRifProteico.valoreKg} kg)` : ''}
            </span>
          </div>
          <p className="nota">
            {regimeProteico.g_kg} g/kg
            {regimeProteico.range ? ` (range ${regimeProteico.range[0]}-${regimeProteico.range[1]})` : ''}
            {regimeProteico.fonte ? ` · fonte: ${regimeProteico.fonte}` : ''}
          </p>
          {regimeProteico.note && <p className="nota">{regimeProteico.note}</p>}
          <p className="avviso">
            Le proteine NON si riducono con la fase clinica come le calorie: questo target è sempre al 100% del
            regime, indipendentemente dalla percentuale di fase scelta sopra.
          </p>

          {!(pesoRifProteico.valoreKg > 0) && (
            <p className="avviso avviso-errore">
              Il regime richiede il peso {LABEL_PESO[pesoRifProteico.chiave] ?? pesoRifProteico.chiave}, non
              disponibile: completa sesso/peso/altezza nel profilo paziente.
            </p>
          )}
          {erroreProteine && <p className="avviso avviso-errore">{erroreProteine}</p>}
          {proteineTarget && (
            <>
              <p className="risultato-primario">{proteineTarget.grammiDie} g/die</p>
              <p className="formula">{proteineTarget.formula}</p>
            </>
          )}
        </>
      ) : (
        <p className="avviso">Imposta peso e altezza nel profilo paziente per determinare il BMI e il regime.</p>
      )}
    </div>
  )
}

function SezioneFabbisognoIdrico({ dati, pesoKg }) {
  const doseRange = { min: dati.ml_kg_die[0], max: dati.ml_kg_die[1], unita: 'ml/kg/die' }
  const risultato = pesoKg > 0 ? calcolaDose(doseRange, pesoKg) : null

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Fabbisogno idrico</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      {risultato ? (
        <>
          <p className="risultato-primario">{formatoRisultato(risultato)}</p>
          <p className="formula">{risultato.formula}</p>
        </>
      ) : (
        <p className="avviso">Imposta il peso nel profilo per calcolare.</p>
      )}
    </div>
  )
}

const CRITERI_MANUALI = [
  { chiave: 'calo', etichetta: 'Calo ponderale >15% in 3-6 mesi' },
  { chiave: 'apporto', etichetta: 'Scarso apporto >10 gg' },
  { chiave: 'elettroliti', etichetta: 'ipoK / ipoPO4 / ipoMg pre-esistenti' },
]

function SezioneRefeeding({ dati, bmi }) {
  const [criteriManuali, setCriteriManuali] = useState({})
  const criterioBmi = criterioBMIRefeeding(bmi)
  const numeroCriteriAttivi =
    (criterioBmi ? 1 : 0) + Object.values(criteriManuali).filter(Boolean).length

  function toggleCriterio(chiave) {
    setCriteriManuali((prev) => ({ ...prev, [chiave]: !prev[chiave] }))
  }

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Refeeding syndrome</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>

      <div className="checklist-refeeding">
        <label className={criterioBmi ? 'criterio-riga criterio-attivo' : 'criterio-riga'}>
          <input type="checkbox" checked={criterioBmi} disabled readOnly />
          BMI &lt; 16 {bmi !== null && bmi !== undefined ? `(profilo: ${bmi})` : '(BMI non disponibile nel profilo)'}
          <span className="chip">automatico dal profilo</span>
        </label>

        {CRITERI_MANUALI.map((c) => (
          <label
            key={c.chiave}
            className={criteriManuali[c.chiave] ? 'criterio-riga criterio-attivo' : 'criterio-riga'}
          >
            <input
              type="checkbox"
              checked={Boolean(criteriManuali[c.chiave])}
              onChange={() => toggleCriterio(c.chiave)}
            />
            {c.etichetta}
          </label>
        ))}
      </div>

      {numeroCriteriAttivi > 0 && (
        <p className="avviso avviso-refeeding">
          ⚠ {numeroCriteriAttivi} criterio/i di rischio presenti: valutare l'avvio calorico
          graduale.
        </p>
      )}

      <div className="scheda">
        <p className="scheda-titolo">Schema di gestione (riferimento)</p>
        <p className="nota">Avvio: {dati.gestione.avvio_kcal}</p>
        <p className="nota">Tiamina: {dati.gestione.tiamina}</p>
        <p className="nota">
          Elettroliti — fosfato: {dati.gestione.correzione_elettroliti.fosfato}; potassio:{' '}
          {dati.gestione.correzione_elettroliti.potassio}; magnesio:{' '}
          {dati.gestione.correzione_elettroliti.magnesio}
        </p>
      </div>
    </div>
  )
}

const COMPONENTI_NPT = [
  { chiave: 'aminoacidi', etichetta: 'Aminoacidi', placeholder: 'es. 10' },
  { chiave: 'glucidi', etichetta: 'Glucidi', placeholder: 'es. 33' },
  { chiave: 'lipidi', etichetta: 'Lipidi', placeholder: 'es. 20' },
]

function media([min, max]) {
  return (min + max) / 2
}

function SezioneNPT({ dati, pesoKg, targetNetto, proteineTarget, lipidiPropofolG }) {
  const [glucidiPercentInput, setGlucidiPercentInput] = useState(String(media(dati.ripartizione_tipica.glucidi_percent)))
  const [lipidiPercentInput, setLipidiPercentInput] = useState(String(media(dati.ripartizione_tipica.lipidi_percent)))
  const [concentrazioni, setConcentrazioni] = useState({})

  const glucidiPercent = Number(glucidiPercentInput)
  const lipidiPercent = Number(lipidiPercentInput)

  let npt = null
  let errore = null
  if (pesoKg > 0 && targetNetto?.kcalNetto > 0 && proteineTarget?.grammiDie > 0) {
    try {
      npt = calcolaNPT({
        pesoKg,
        kcalTotaliTarget: targetNetto.kcalNetto,
        aminoacidiG: proteineTarget.grammiDie,
        glucidiPercent,
        lipidiPercent,
        densitaKcal: dati.densita_kcal,
        limiti: dati.limiti,
        lipidiPropofolG,
      })
    } catch (e) {
      errore = e.message
    }
  }

  const componenteGrammi = npt
    ? { aminoacidi: npt.aminoacidi.g, glucidi: npt.glucidi.g, lipidi: npt.lipidi.g }
    : {}

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Calcolatore NPT</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      <p className="nota">{dati.descrizione}</p>
      <p className="nota">{dati.nota}</p>

      <div className="griglia-campi-piccola">
        <div className="campo-numerico">
          Peso (limiti mg/kg/min, g/kg/die)
          <p className="formula formula-piccola">{pesoKg > 0 ? `${pesoKg} kg (reale, dal profilo)` : 'non impostato'}</p>
        </div>
        <div className="campo-numerico">
          Target netto (kcal/die)
          <p className="formula formula-piccola">
            {targetNetto?.kcalNetto > 0 ? `${targetNetto.kcalNetto} kcal/die (da "Propofol in corso")` : 'non disponibile'}
          </p>
        </div>
        <div className="campo-numerico">
          Aminoacidi
          <p className="formula formula-piccola">
            {proteineTarget?.grammiDie > 0 ? `${proteineTarget.grammiDie} g/die (da "Proteine")` : 'non disponibile'}
          </p>
        </div>
      </div>

      <div className="griglia-campi-piccola">
        <label className="campo-numerico">
          Glucidi (% kcal totali, tip. {dati.ripartizione_tipica.glucidi_percent[0]}-
          {dati.ripartizione_tipica.glucidi_percent[1]}%)
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            inputMode="decimal"
            value={glucidiPercentInput}
            onChange={(e) => setGlucidiPercentInput(e.target.value)}
          />
        </label>
        <label className="campo-numerico">
          Lipidi (% kcal totali, tip. {dati.ripartizione_tipica.lipidi_percent[0]}-
          {dati.ripartizione_tipica.lipidi_percent[1]}%)
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            inputMode="decimal"
            value={lipidiPercentInput}
            onChange={(e) => setLipidiPercentInput(e.target.value)}
          />
        </label>
      </div>

      {!(pesoKg > 0) && <p className="avviso">Imposta il peso nel profilo per calcolare.</p>}
      {!(targetNetto?.kcalNetto > 0) && (
        <p className="avviso">
          Completa "Fabbisogno calorico" e "Propofol in corso" sopra per ottenere un target netto.
        </p>
      )}
      {!(proteineTarget?.grammiDie > 0) && (
        <p className="avviso">Completa "Proteine" sopra per ottenere i grammi di aminoacidi.</p>
      )}
      {errore && <p className="avviso avviso-errore">{errore}</p>}

      {npt && (
        <>
          <p className="risultato-primario">{npt.kcalTotali} kcal/die totali</p>

          <div className="lista-voci-nutrizione">
            <div className="voce-nutrizione">
              <p className="scheda-titolo">Aminoacidi</p>
              <p className="risultato-primario">
                {npt.aminoacidi.g} g ({npt.aminoacidi.kcal} kcal)
              </p>
              <p className="formula">{npt.aminoacidi.formula}</p>
            </div>

            <div className="voce-nutrizione">
              <p className="scheda-titolo">Glucidi</p>
              <p className="risultato-primario">
                {npt.glucidi.g} g ({npt.glucidi.kcal} kcal)
              </p>
              <p className="formula">{npt.glucidi.formula}</p>
              <p className="nota">{npt.glucidi.mgKgMin} mg/kg/min (limite {dati.limiti.glucosio_max_mg_kg_min})</p>
              {npt.glucidi.superaLimite && (
                <p className="avviso avviso-errore">Supera il limite di {dati.limiti.glucosio_max_mg_kg_min} mg/kg/min.</p>
              )}
            </div>

            <div className="voce-nutrizione">
              <p className="scheda-titolo">Lipidi</p>
              <p className="risultato-primario">
                {npt.lipidi.g} g ({npt.lipidi.kcal} kcal)
              </p>
              <p className="formula">{npt.lipidi.formula}</p>
              {npt.lipidi.propofolG > 0 && (
                <p className="nota">
                  + {npt.lipidi.propofolG} g/die già dati dal propofol = {npt.lipidi.gTotaliConPropofol} g/die
                  totali
                </p>
              )}
              <p className="nota">{npt.lipidi.gKgDie} g/kg/die (limite {dati.limiti.lipidi_max_g_kg_die})</p>
              {npt.lipidi.superaLimite && (
                <p className="avviso avviso-errore">Supera il limite di {dati.limiti.lipidi_max_g_kg_die} g/kg/die.</p>
              )}
            </div>
          </div>

          <div className="scheda">
            <p className="scheda-titolo">Volume per componente</p>
            <p className="nota">
              Il JSON non definisce concentrazioni standard: inserisci quella della soluzione
              commerciale che stai usando (g/100ml).
            </p>
            <div className="griglia-campi-piccola">
              {COMPONENTI_NPT.map((c) => {
                const grammi = componenteGrammi[c.chiave]
                const concInput = concentrazioni[c.chiave] ?? ''
                const conc = concInput.trim?.() === '' ? null : Number(concInput)
                let volume = null
                let erroreVolume = null
                if (conc > 0) {
                  try {
                    volume = calcolaVolumeComponente(grammi, conc)
                  } catch (e) {
                    erroreVolume = e.message
                  }
                }
                return (
                  <div key={c.chiave} className="campo-numerico">
                    {c.etichetta} — conc. (g/100ml)
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      placeholder={c.placeholder}
                      value={concInput}
                      onChange={(e) =>
                        setConcentrazioni((prev) => ({ ...prev, [c.chiave]: e.target.value }))
                      }
                    />
                    {erroreVolume && <p className="avviso avviso-errore">{erroreVolume}</p>}
                    {volume && <p className="formula formula-piccola">{volume.formula}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
