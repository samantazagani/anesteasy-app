import { useEffect, useState } from 'react'
import nutrizioneData from '../../data/nutrizione.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaDose, formatoRisultato } from '../lib/doseCalculator'
import { categoriaEta } from '../lib/categoriaEta'
import {
  calcolaHarrisBenedict,
  calcolaPesoNutrizionale,
  selezionaRegimeProteico,
  pesoDiRiferimento,
  percentualeFaseDefault,
  calcolaTargetCalorico,
  calcolaCaloriePropofol,
  calcolaCaloriaGlucosata,
  calcolaTargetNetto,
  calcolaSemaforoESPEN,
  calcolaProteineTarget,
  calcolaNPT,
  calcolaVolumeComponente,
  criterioBMIRefeeding,
  calcolaBilancioAzotato,
  calcolaConfrontoProdotti,
} from '../lib/nutrizioneCalculator'
import '../styles/risultato.css'
import './Nutrizione.css'

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)', ABW: 'ABW (peso aggiustato)' }
const LABEL_BRACKET_PROTEICO = {
  non_obeso: 'BMI < 30',
  'obeso_BMI_30-40': 'BMI 30-40',
  'obeso_BMI>=40': 'BMI ≥ 40',
}
const LABEL_SEMAFORO = { verde: 'Verde', giallo: 'Giallo', rosso: 'Rosso' }

export function Nutrizione() {
  const { profile, bmi, ibw } = usePatientProfile()
  const pesoKg = profile.pesoKg
  const categoria = categoriaEta(profile.eta)

  const {
    fabbisogno_calorico: fabbisognoCalorico,
    percentuale_fase: percentualeFaseData,
    proteine,
    propofol_calorie: propofolCalorie,
    glucosata_calorie: glucosataCalorie,
    fabbisogno_idrico: fabbisognoIdrico,
  } = nutrizioneData

  // --- Passo 1: peso nutrizionale dal BMI (sostituisce il vecchio regime-calorico-per-BMI:
  // il target calorico e' ora un range fisso, a cambiare col BMI e' solo il peso) ---------
  let pesoNutrizionale = null
  let errorePesoNutrizionale = null
  if (pesoKg > 0) {
    try {
      pesoNutrizionale = calcolaPesoNutrizionale({ pesoKg, ibw, bmi, categoria })
    } catch (e) {
      errorePesoNutrizionale = e.message
    }
  }

  const regimeProteico = selezionaRegimeProteico(proteine.regime_per_bmi, bmi)
  const pesoRifProteico = pesoDiRiferimento(regimeProteico, { pesoKg, ibw, pesoNutrizionale })

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

  // --- Passo 2-3: target calorico (grezzo e di fase), su peso_nutrizionale --------------
  let targetCalorico = null
  let erroreTargetCalorico = null
  if (pesoNutrizionale?.valoreKg > 0 && percentualeFaseN > 0) {
    try {
      targetCalorico = calcolaTargetCalorico({
        kcalKgRange: fabbisognoCalorico.kcal_kg,
        pesoRiferimentoKg: pesoNutrizionale.valoreKg,
        percentualeFase: percentualeFaseN,
      })
    } catch (e) {
      erroreTargetCalorico = e.message
    }
  }

  // --- Passo 4: infusioni in corso (propofol + glucosata, entrambe opzionali) -----------
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

  const [mlHGlucosataInput, setMlHGlucosataInput] = useState('')
  const [concentrazioneGlucosataInput, setConcentrazioneGlucosataInput] = useState('5')
  const mlHGlucosata = mlHGlucosataInput.trim() === '' ? null : Number(mlHGlucosataInput)
  const concentrazioneGlucosata = concentrazioneGlucosataInput.trim() === '' ? null : Number(concentrazioneGlucosataInput)
  let calorieGlucosata = null
  let erroreGlucosata = null
  if (mlHGlucosata > 0 && concentrazioneGlucosata > 0) {
    try {
      calorieGlucosata = calcolaCaloriaGlucosata({
        mlH: mlHGlucosata,
        concentrazionePercento: concentrazioneGlucosata,
        kcalPerGGlucosio: glucosataCalorie.kcal_per_g_glucosio,
      })
    } catch (e) {
      erroreGlucosata = e.message
    }
  }

  // --- Passo 5: target netto (di fase, meno propofol e glucosata) ----------------------
  const targetNetto = targetCalorico
    ? calcolaTargetNetto({
        kcalFase: targetCalorico.kcalFase,
        kcalPropofol: caloriePropofol?.kcalDie ?? 0,
        kcalGlucosata: calorieGlucosata?.kcalDie ?? 0,
      })
    : null

  // Autocontrollo ESPEN: kcal/kg EFFETTIVE (dopo fase e sottrazioni) confrontate col
  // range ESPEN, sempre mostrate accanto al totale (mai solo una nota in fondo).
  let semaforo = null
  if (targetNetto && pesoNutrizionale?.valoreKg > 0) {
    try {
      semaforo = calcolaSemaforoESPEN({
        kcalDaNutrizione: targetNetto.kcalNetto,
        pesoNutrizionaleKg: pesoNutrizionale.valoreKg,
        ibwKg: ibw,
        bmi,
        faseAcutaPrecoce: fase.fase.startsWith('acuta precoce'),
        percentualeFase: percentualeFaseN,
      })
    } catch {
      semaforo = null
    }
  }

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

  const targetProteineGKg =
    proteineTarget?.grammiDie > 0 && pesoRifProteico.valoreKg > 0 ? proteineTarget.grammiDie / pesoRifProteico.valoreKg : null

  return (
    <section id="nutrizione">
      <h1>Nutrizione</h1>
      <div className="riga-meta">
        <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg (reale)` : 'non impostato'}</span>
        <span className="chip">BMI: {bmi !== null && bmi !== undefined ? bmi : 'non disponibile'}</span>
      </div>

      <SezioneFabbisognoCalorico
        fabbisognoCalorico={fabbisognoCalorico}
        pesoNutrizionale={pesoNutrizionale}
        errorePesoNutrizionale={errorePesoNutrizionale}
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

      <SezioneInfusioni
        propofolCalorie={propofolCalorie}
        glucosataCalorie={glucosataCalorie}
        mlHPropofoloInput={mlHPropofoloInput}
        onMlHPropofoloChange={setMlHPropofoloInput}
        caloriePropofol={caloriePropofol}
        errorePropofol={errorePropofol}
        mlHGlucosataInput={mlHGlucosataInput}
        onMlHGlucosataChange={setMlHGlucosataInput}
        concentrazioneGlucosataInput={concentrazioneGlucosataInput}
        onConcentrazioneGlucosataChange={setConcentrazioneGlucosataInput}
        calorieGlucosata={calorieGlucosata}
        erroreGlucosata={erroreGlucosata}
        targetCalorico={targetCalorico}
        targetNetto={targetNetto}
        semaforo={semaforo}
      />

      <SezioneProteine
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

      <SezioneBilancioAzotato proteineTarget={proteineTarget} />

      <SezioneProdottoCommerciale
        prodottiEnterali={nutrizioneData.prodotti_enterali}
        prodottiParenterali={nutrizioneData.prodotti_parenterali}
        filtriEnterale={nutrizioneData.filtri_paziente_enterale}
        targetNetto={targetNetto}
        pesoRiferimentoKg={pesoNutrizionale?.valoreKg ?? null}
        targetProteineGKg={targetProteineGKg}
      />
    </section>
  )
}

function SezioneFabbisognoCalorico({
  fabbisognoCalorico,
  pesoNutrizionale,
  errorePesoNutrizionale,
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
      </div>

      <div className="scheda">
        <p className="scheda-titolo">Peso nutrizionale (automatico dal BMI)</p>
        {pesoNutrizionale ? (
          <>
            <div className="riga-meta">
              <span className="chip">
                Peso di riferimento: {LABEL_PESO[pesoNutrizionale.chiave] ?? pesoNutrizionale.chiave}
                {pesoNutrizionale.valoreKg > 0 ? ` (${pesoNutrizionale.valoreKg} kg)` : ''}
              </span>
              {pesoNutrizionale.bmiUsato !== null && <span className="chip">BMI: {pesoNutrizionale.bmiUsato}</span>}
            </div>
            <p className="nota">
              {fabbisognoCalorico.kcal_kg[0]}-{fabbisognoCalorico.kcal_kg[1]} kcal/kg · regola: BMI&lt;18.5 → reale,
              18.5-30 → IBW, &gt;30 → ABW
            </p>
            {pesoNutrizionale.formula && <p className="formula formula-piccola">{pesoNutrizionale.formula}</p>}
            {pesoNutrizionale.pesoPediatricoEscluso && (
              <p className="avviso avviso-pediatrico">
                Il BMI indicherebbe {pesoNutrizionale.pesoPediatricoEscluso}, non valido su un paziente pediatrico
                (formula per adulti): usato il peso reale.
              </p>
            )}
            {!(pesoNutrizionale.valoreKg > 0) && (
              <p className="avviso avviso-errore">
                Serve il peso {LABEL_PESO[pesoNutrizionale.chiave] ?? pesoNutrizionale.chiave}, non disponibile:
                completa sesso/peso/altezza nel profilo paziente.
              </p>
            )}
          </>
        ) : (
          <p className="avviso">
            {errorePesoNutrizionale ?? 'Imposta peso e altezza nel profilo paziente per determinare il BMI.'}
          </p>
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

function SezioneInfusioni({
  propofolCalorie,
  glucosataCalorie,
  mlHPropofoloInput,
  onMlHPropofoloChange,
  caloriePropofol,
  errorePropofol,
  mlHGlucosataInput,
  onMlHGlucosataChange,
  concentrazioneGlucosataInput,
  onConcentrazioneGlucosataChange,
  calorieGlucosata,
  erroreGlucosata,
  targetCalorico,
  targetNetto,
  semaforo,
}) {
  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Infusioni in corso</h2>
      </div>

      <div className="scheda">
        <p className="scheda-titolo">Propofol</p>
        <p className="nota">{propofolCalorie.descrizione}</p>
        <label className="campo-numerico campo-target">
          Velocità propofol (ml/h, lasciare vuoto se non in corso)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="es. 20"
            value={mlHPropofoloInput}
            onChange={(e) => onMlHPropofoloChange(e.target.value)}
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
      </div>

      <div className="scheda">
        <p className="scheda-titolo">Glucosata</p>
        <p className="nota">{glucosataCalorie.descrizione}</p>
        <div className="griglia-campi-piccola">
          <label className="campo-numerico">
            Velocità glucosata (ml/h, lasciare vuoto se non in corso)
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="es. 84"
              value={mlHGlucosataInput}
              onChange={(e) => onMlHGlucosataChange(e.target.value)}
            />
          </label>
          <label className="campo-numerico">
            Concentrazione (%)
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="es. 5"
              value={concentrazioneGlucosataInput}
              onChange={(e) => onConcentrazioneGlucosataChange(e.target.value)}
            />
          </label>
        </div>
        {erroreGlucosata && <p className="avviso avviso-errore">{erroreGlucosata}</p>}
        {calorieGlucosata && (
          <>
            <p className="risultato-primario">{calorieGlucosata.kcalDie} kcal/die dalla glucosata</p>
            <p className="formula">{calorieGlucosata.formula}</p>
          </>
        )}
      </div>

      {targetCalorico && (
        <div className="scheda scheda-sottrazione">
          <p className="scheda-titolo">Target netto da nutrizione</p>
          <p className="nota">Prima (target di fase): {targetCalorico.kcalFase} kcal/die</p>
          <p className="nota">Meno propofol: {caloriePropofol ? `-${caloriePropofol.kcalDie}` : '0'} kcal/die</p>
          <p className="nota">Meno glucosata: {calorieGlucosata ? `-${calorieGlucosata.kcalDie}` : '0'} kcal/die</p>
          {targetNetto && (
            <>
              <div className="riga-meta">
                <p className="risultato-primario">Dopo: {targetNetto.kcalNetto} kcal/die (target netto)</p>
                {semaforo?.livello && (
                  <span className={`chip chip-semaforo semaforo-${semaforo.livello}`}>
                    {semaforo.kcalKgEffettive} kcal/kg{semaforo.base === 'IBW' ? ' (peso_nutrizionale)' : ''} ·{' '}
                    {semaforo.base === 'IBW' ? `${semaforo.kcalKgControllo} kcal/kg IBW · ` : ''}
                    {LABEL_SEMAFORO[semaforo.livello]}
                  </span>
                )}
              </div>
              <p className="formula">{targetNetto.formula}</p>
              {semaforo?.superaLimiteFaseAcuta && (
                <p className="avviso avviso-sicurezza">
                  Fase acuta precoce con percentuale &gt;70% del target: rischio overfeeding, rivedere la
                  percentuale scelta sopra.
                </p>
              )}
              {targetNetto.copertoDaPropofol && (
                <p className="avviso avviso-errore">
                  Le infusioni in corso da sole coprono o superano il target di fase: nessuna caloria aggiuntiva
                  netta da nutrizione (verifica comunque proteine e lipidi totali sotto).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SezioneProteine({ regimeProteico, pesoRifProteico, proteineTarget, erroreProteine }) {
  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Proteine</h2>
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
            {targetNetto?.kcalNetto > 0 ? `${targetNetto.kcalNetto} kcal/die (da "Infusioni in corso")` : 'non disponibile'}
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
          Completa "Fabbisogno calorico" e "Infusioni in corso" sopra per ottenere un target netto.
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

// --- Bilancio azotato ----------------------------------------------------------------------

function SezioneBilancioAzotato({ proteineTarget }) {
  const [proteineInput, setProteineInput] = useState('')
  const [uunInput, setUunInput] = useState('')

  // Precompila con il target proteico calcolato sopra, ma resta modificabile: la dose
  // EFFETTIVAMENTE somministrata (quella rilevante per il bilancio) puo' differire dal target.
  useEffect(() => {
    if (proteineTarget?.grammiDie > 0 && proteineInput.trim() === '') {
      setProteineInput(String(proteineTarget.grammiDie))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proteineTarget?.grammiDie])

  const proteineN = proteineInput.trim() === '' ? null : Number(proteineInput)
  const uunN = uunInput.trim() === '' ? null : Number(uunInput)

  let risultato = null
  let errore = null
  if (proteineN !== null && uunN !== null) {
    try {
      risultato = calcolaBilancioAzotato({ proteineGDie: proteineN, uunGDie: uunN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Bilancio azotato</h2>
      </div>
      <p className="nota">g N/24h = (proteine somministrate ÷ 6.25) - (azoturia UUN + 4 g perdite non ureiche).</p>

      <div className="griglia-campi-piccola">
        <label className="campo-numerico">
          Proteine somministrate (g/die)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={proteineInput}
            onChange={(e) => setProteineInput(e.target.value)}
          />
        </label>
        <label className="campo-numerico">
          Azoturia UUN (g/24h)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="es. 12"
            value={uunInput}
            onChange={(e) => setUunInput(e.target.value)}
          />
        </label>
      </div>
      {proteineTarget?.grammiDie > 0 && (
        <p className="nota">
          Precompilato con il target proteico ({proteineTarget.grammiDie} g/die): modificabile se la dose
          effettivamente somministrata è diversa.
        </p>
      )}

      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">
            {risultato.bilancioG} g N/24h ({risultato.catabolico ? 'catabolico' : 'anabolico'})
          </p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </div>
  )
}

// --- B) Somministrazione con prodotto commerciale (opzionale) --------------------------

const CONDIZIONE_TUTTI = '__tutti__'

function SezioneProdottoCommerciale({
  prodottiEnterali,
  prodottiParenterali,
  filtriEnterale,
  targetNetto,
  pesoRiferimentoKg,
  targetProteineGKg,
}) {
  const [tipoProdotto, setTipoProdotto] = useState('enterale')
  const [condizione, setCondizione] = useState(CONDIZIONE_TUTTI)
  const [prodottoScelto, setProdottoScelto] = useState(null)

  const database = tipoProdotto === 'enterale' ? prodottiEnterali : prodottiParenterali
  const condizioneAttiva =
    tipoProdotto === 'enterale' && condizione !== CONDIZIONE_TUTTI
      ? filtriEnterale.condizioni.find((c) => c.condizione === condizione)
      : null
  const vociFiltrate = condizioneAttiva
    ? database.voci.filter((v) => condizioneAttiva.prodotti.includes(v.nome))
    : database.voci

  function selezionaTipo(t) {
    setTipoProdotto(t)
    setCondizione(CONDIZIONE_TUTTI)
    setProdottoScelto(null)
  }

  const kcalDaNutrizione = targetNetto?.kcalNetto ?? 0
  const puoCalcolare = kcalDaNutrizione > 0 && pesoRiferimentoKg > 0

  let confronto = null
  let erroreConfronto = null
  if (puoCalcolare && vociFiltrate.length > 0) {
    try {
      confronto = calcolaConfrontoProdotti({ prodotti: vociFiltrate, kcalDaNutrizione, pesoRiferimentoKg, targetProteineGKg })
    } catch (e) {
      erroreConfronto = e.message
    }
  }

  const rigaScelta = confronto?.find((r) => r.nome === prodottoScelto) ?? null

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Somministrazione con prodotto commerciale (opzionale)</h2>
      </div>
      <p className="nota">
        Solo se si usa un prodotto COMMERCIALE (invece di una sacca galenica personalizzata): converte lo stesso
        target calorico netto calcolato sopra in ml/h del prodotto scelto.
      </p>

      <div className="fasi-proteine" role="tablist" aria-label="Tipo prodotto">
        <button
          type="button"
          role="tab"
          aria-selected={tipoProdotto === 'enterale'}
          className={tipoProdotto === 'enterale' ? 'fase-item selezionato' : 'fase-item'}
          onClick={() => selezionaTipo('enterale')}
        >
          Enterale ({prodottiEnterali.voci.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tipoProdotto === 'parenterale'}
          className={tipoProdotto === 'parenterale' ? 'fase-item selezionato' : 'fase-item'}
          onClick={() => selezionaTipo('parenterale')}
        >
          Parenterale ({prodottiParenterali.voci.length})
        </button>
      </div>

      {tipoProdotto === 'enterale' && (
        <label className="campo-numerico campo-target">
          Filtra per condizione clinica
          <select
            value={condizione}
            onChange={(e) => {
              setCondizione(e.target.value)
              setProdottoScelto(null)
            }}
          >
            <option value={CONDIZIONE_TUTTI}>Tutti i prodotti</option>
            {filtriEnterale.condizioni.map((c) => (
              <option key={c.condizione} value={c.condizione}>
                {c.condizione}
              </option>
            ))}
          </select>
        </label>
      )}

      {!puoCalcolare && (
        <p className="avviso">
          Completa profilo, fase clinica e infusioni sopra per calcolare ml/h e apporti effettivi: intanto, sotto,
          la scheda di riferimento dei prodotti.
        </p>
      )}
      {erroreConfronto && <p className="avviso avviso-errore">{erroreConfronto}</p>}

      {rigaScelta && (
        <div className="scheda scheda-sottrazione">
          <p className="scheda-titolo">{rigaScelta.nome}</p>
          <p className="risultato-primario">{rigaScelta.mlH} ml/h</p>
          <p className="formula">{rigaScelta.formula}</p>
          <p className="nota">
            {rigaScelta.kcalDie} kcal/die · {rigaScelta.proteineGDie} g proteine/die
            {rigaScelta.proteineGKg !== null ? ` (${rigaScelta.proteineGKg} g/kg)` : ''}
          </p>
          {targetProteineGKg > 0 && rigaScelta.proteineGKg !== null && rigaScelta.proteineGKg < targetProteineGKg && (
            <p className="avviso avviso-sicurezza">
              Proteine sotto il target ({targetProteineGKg.toFixed(2)} g/kg): valutare un modulo proteico o un
              prodotto più iperproteico.
            </p>
          )}
        </div>
      )}

      <div className="tabella-scroll">
        <table className="tabella-prodotti">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>kcal/ml</th>
              <th>Prot. g/ml</th>
              {tipoProdotto === 'enterale' && <th>Fibre</th>}
              {tipoProdotto === 'enterale' && <th>Indicazione</th>}
              {confronto && <th>ml/h</th>}
              {confronto && <th>Proteine g/kg</th>}
            </tr>
          </thead>
          <tbody>
            {(confronto ?? vociFiltrate).map((riga) => {
              const voce = database.voci.find((v) => v.nome === riga.nome) ?? riga
              const selezionata = riga.nome === prodottoScelto
              return (
                <tr
                  key={riga.nome}
                  className={selezionata ? 'riga-prima-scelta riga-cliccabile' : 'riga-cliccabile'}
                  onClick={() => confronto && setProdottoScelto(riga.nome)}
                >
                  <td>{riga.nome}</td>
                  <td>{voce.kcal_ml}</td>
                  <td>{voce.prot_g_ml}</td>
                  {tipoProdotto === 'enterale' && <td>{voce.fibre}</td>}
                  {tipoProdotto === 'enterale' && <td>{voce.indicazione}</td>}
                  {confronto && <td>{riga.mlH}</td>}
                  {confronto && <td>{riga.proteineGKg ?? '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {confronto && (
        <p className="nota">
          Ordinato per vicinanza al target proteico{targetProteineGKg > 0 ? ` (${targetProteineGKg.toFixed(2)} g/kg)` : ''}.
          Clicca una riga per i dettagli.
        </p>
      )}
    </div>
  )
}
