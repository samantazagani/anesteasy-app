import { useState } from 'react'
import nutrizioneData from '../../data/nutrizione.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaDose } from '../lib/doseCalculator'
import {
  calcolaHarrisBenedict,
  calcolaNPT,
  calcolaVolumeComponente,
  criterioBMIRefeeding,
} from '../lib/nutrizioneCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Nutrizione.css'

function media([min, max]) {
  return (min + max) / 2
}

export function Nutrizione() {
  const { profile, bmi } = usePatientProfile()
  const pesoKg = profile.pesoKg

  const { fabbisogno_calorico: fabbisognoCalorico, proteine, fabbisogno_idrico: fabbisognoIdrico } =
    nutrizioneData

  // Condivisi tra "Fabbisogno calorico"/"Proteine" e il calcolatore NPT, cosi' la NPT
  // riparte dai valori scelti sopra invece di richiederli una seconda volta.
  const [targetKcalKg, setTargetKcalKg] = useState(media(fabbisognoCalorico.peso_based.kcal_kg))
  const [faseProteineIndice, setFaseProteineIndice] = useState(0)
  const [gKgAminoacidi, setGKgAminoacidi] = useState(media(proteine[0].g_kg))

  function selezionaFase(i) {
    setFaseProteineIndice(i)
    setGKgAminoacidi(media(proteine[i].g_kg))
  }

  return (
    <section id="nutrizione">
      <h1>Nutrizione</h1>
      <div className="riga-meta">
        <span className="chip">Peso: {pesoKg > 0 ? `${pesoKg} kg (reale)` : 'non impostato'}</span>
        <BadgeVerifica verificato={false} />
      </div>

      <SezioneFabbisognoCalorico
        dati={fabbisognoCalorico}
        pesoKg={pesoKg}
        profile={profile}
        targetKcalKg={targetKcalKg}
        onTargetKcalKgChange={setTargetKcalKg}
      />

      <SezioneProteine
        lista={proteine}
        pesoKg={pesoKg}
        faseIndice={faseProteineIndice}
        onFaseChange={selezionaFase}
        gKgAminoacidi={gKgAminoacidi}
        onGKgAminoacidiChange={setGKgAminoacidi}
      />

      <SezioneFabbisognoIdrico dati={fabbisognoIdrico} pesoKg={pesoKg} />

      <SezioneRefeeding dati={nutrizioneData.refeeding_syndrome} bmi={bmi} />

      <SezioneNPT
        dati={nutrizioneData.npt_calcolatore}
        pesoKg={pesoKg}
        targetKcalKg={targetKcalKg}
        gKgAminoacidi={gKgAminoacidi}
      />
    </section>
  )
}

function SezioneFabbisognoCalorico({ dati, pesoKg, profile, targetKcalKg, onTargetKcalKgChange }) {
  const { peso_based: pesoBased, harris_benedict: harrisBenedict } = dati
  const doseRange = { min: pesoBased.kcal_kg[0], max: pesoBased.kcal_kg[1], unita: 'kcal/kg' }
  const risultatoRange = pesoKg > 0 ? calcolaDose(doseRange, pesoKg) : null

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
        <BadgeVerifica verificato={pesoBased.verificato} />
      </div>

      <div className="scheda">
        <p className="scheda-titolo">Range su peso reale</p>
        {risultatoRange ? (
          <p className="formula">{risultatoRange.formula}</p>
        ) : (
          <p className="avviso">Imposta il peso nel profilo per calcolare.</p>
        )}
        <p className="nota">{pesoBased.note}</p>

        <label className="campo-numerico campo-target">
          Target kcal/kg scelto (per la NPT più sotto)
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={targetKcalKg}
            onChange={(e) => onTargetKcalKgChange(Number(e.target.value))}
          />
        </label>
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
          <p className="avviso">
            Completa peso, altezza ed età nel profilo paziente per calcolare.
          </p>
        )}
        {erroreHb && <p className="avviso avviso-errore">{erroreHb}</p>}
        {hb && (
          <>
            <p className="formula">{hb.formulaBasale}</p>
            <p className="risultato-evidenza">→ {hb.basaleKcal} kcal/die (basale)</p>
            {hb.formulaStress && (
              <>
                <p className="formula">{hb.formulaStress}</p>
                <p className="risultato-evidenza">→ {hb.kcalConStress} kcal/die (con stress)</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SezioneProteine({ lista, pesoKg, faseIndice, onFaseChange, gKgAminoacidi, onGKgAminoacidiChange }) {
  const fase = lista[faseIndice]
  const doseRange = { min: fase.g_kg[0], max: fase.g_kg[1], unita: 'g/kg' }
  const risultato = pesoKg > 0 ? calcolaDose(doseRange, pesoKg) : null

  return (
    <div className="riquadro-nutrizione">
      <div className="riga-meta">
        <h2>Proteine</h2>
        <BadgeVerifica verificato={fase.verificato} />
      </div>

      <div className="fasi-proteine" role="tablist" aria-label="Fase">
        {lista.map((f, i) => (
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

      {risultato ? (
        <p className="formula">{risultato.formula}</p>
      ) : (
        <p className="avviso">Imposta il peso nel profilo per calcolare.</p>
      )}

      <label className="campo-numerico campo-target">
        g/kg scelto (per la NPT più sotto)
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={gKgAminoacidi}
          onChange={(e) => onGKgAminoacidiChange(Number(e.target.value))}
        />
      </label>
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
        <p className="formula">{risultato.formula}</p>
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
        <BadgeVerifica verificato={dati.gestione.verificato} />
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

function SezioneNPT({ dati, pesoKg, targetKcalKg, gKgAminoacidi }) {
  const [glucidiPercentInput, setGlucidiPercentInput] = useState(String(media(dati.ripartizione_tipica.glucidi_percent)))
  const [lipidiPercentInput, setLipidiPercentInput] = useState(String(media(dati.ripartizione_tipica.lipidi_percent)))
  const [concentrazioni, setConcentrazioni] = useState({})

  const glucidiPercent = Number(glucidiPercentInput)
  const lipidiPercent = Number(lipidiPercentInput)

  let npt = null
  let errore = null
  if (pesoKg > 0 && targetKcalKg > 0 && gKgAminoacidi > 0) {
    try {
      npt = calcolaNPT({
        pesoKg,
        targetKcalKg,
        gKgAminoacidi,
        glucidiPercent,
        lipidiPercent,
        densitaKcal: dati.densita_kcal,
        limiti: dati.limiti,
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

      <div className="griglia-campi-piccola">
        <div className="campo-numerico">
          Peso
          <p className="formula formula-piccola">{pesoKg > 0 ? `${pesoKg} kg (dal profilo)` : 'non impostato'}</p>
        </div>
        <div className="campo-numerico">
          Target kcal/kg
          <p className="formula formula-piccola">{targetKcalKg} kcal/kg (da "Fabbisogno calorico")</p>
        </div>
        <div className="campo-numerico">
          Aminoacidi
          <p className="formula formula-piccola">{gKgAminoacidi} g/kg (da "Proteine")</p>
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
      {errore && <p className="avviso avviso-errore">{errore}</p>}

      {npt && (
        <>
          <p className="risultato-evidenza">→ {npt.kcalTotali} kcal/die totali</p>

          <div className="lista-voci-nutrizione">
            <div className="voce-nutrizione">
              <p className="scheda-titolo">Aminoacidi</p>
              <p className="formula">{npt.aminoacidi.formula}</p>
            </div>

            <div className="voce-nutrizione">
              <p className="scheda-titolo">Glucidi</p>
              <p className="formula">{npt.glucidi.formula}</p>
              <p className="nota">{npt.glucidi.mgKgMin} mg/kg/min (limite {dati.limiti.glucosio_max_mg_kg_min})</p>
              {npt.glucidi.superaLimite && (
                <p className="avviso avviso-errore">Supera il limite di {dati.limiti.glucosio_max_mg_kg_min} mg/kg/min.</p>
              )}
            </div>

            <div className="voce-nutrizione">
              <p className="scheda-titolo">Lipidi</p>
              <p className="formula">{npt.lipidi.formula}</p>
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
