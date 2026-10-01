import { useState } from 'react'
import antibioticiData from '../../data/antibiotici_template.json'
import profilassiData from '../../data/profilassi-antibiotica.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { risolviPeso } from '../lib/pesoResolver'
import { calcolaDose, formatoRisultato } from '../lib/doseCalculator'
import { InfoFonte } from '../components/InfoFonte.jsx'
import '../styles/risultato.css'
import './CalcolatoreAntibiotici.css'

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)', LBW: 'LBW (peso magro)' }

// Etichette italiane per i campi testuali eterogenei di terapia_antibiotica.farmaci: ogni
// farmaco del prontuario ha un sottoinsieme diverso di questi campi (vancomicina ha
// livello_terapeutico/profilassi_endocardite, meropenem no, ecc.) — l'unica alternativa a
// questa mappa e' hardcodare una scheda per farmaco, piu' fragile ad ogni aggiunta futura.
const LABEL_CAMPO_TERAPIA = {
  dose_carico: 'Dose di carico',
  livello_terapeutico: 'Livello terapeutico',
  pediatrico: 'Pediatrico',
  profilassi_endocardite: 'Profilassi endocardite',
  ira: 'Insufficienza renale',
  adulti: 'Adulti',
  dopo_dialisi: 'Dopo dialisi',
}
const CAMPI_TERAPIA_ESCLUSI = new Set(['id', 'nome', 'classe', 'verificato', 'fonte'])

export function CalcolatoreAntibiotici() {
  const { profile, bmi, ibw, lbw, abw } = usePatientProfile()
  const antibiotici = antibioticiData.antibiotici

  const [antibioticoId, setAntibioticoId] = useState(antibiotici[0]?.id ?? null)
  const antibiotico = antibiotici.find((a) => a.id === antibioticoId) ?? null

  // Finche' il medico non assegna una fonte reale, la voce e' un placeholder di
  // struttura: non va mai mostrato un numero calcolato come se fosse una dose vera.
  const nonCompilato = antibiotico ? !antibiotico.fonte : true

  const categoria = categoriaEta(profile.eta)
  const derivati = { pesoKg: profile.pesoKg, ibw, lbw, abw, bmi, categoria }

  let peso = null
  let risultato = null
  let erroreCalcolo = null
  let profiloIncompleto = false

  if (antibiotico && !nonCompilato) {
    peso = risolviPeso(antibiotico.dose.peso, derivati)
    const richiedePeso = antibiotico.dose.unita.includes('/kg')

    if (richiedePeso && !(peso.valoreKg > 0)) {
      profiloIncompleto = true
    } else {
      try {
        risultato = calcolaDose(antibiotico.dose, peso.valoreKg)
      } catch (e) {
        erroreCalcolo = e.message
      }
    }
  }

  const doseMassima = antibiotico?.dose.dose_massima_mg
  const superaTetto =
    risultato &&
    doseMassima > 0 &&
    (risultato.tipo === 'singolo' ? risultato.valore : risultato.max) > doseMassima

  return (
    <section id="calcolatore-antibiotici">
      <h1>Antibiotici</h1>
      <p className="sottotitolo">
        Profilassi chirurgica e terapia antibiotica come contenuto di riferimento (schede
        leggibili, non un motore di calcolo su dosi testuali) — eccetto la dose pediatrica di
        cefazolina, calcolata su peso reale.
      </p>

      <SezioneProfilassi profilassi={profilassiData} profile={profile} categoria={categoria} />
      <SezioneTerapiaAntibiotica terapia={profilassiData.terapia_antibiotica} />

      <h2 className="titolo-sezione-antibiotici">Calcolatore per farmaco</h2>
      <p className="sottotitolo">
        Struttura in compilazione (data/antibiotici_template.json): dose su peso/BMI, timing di
        somministrazione, ridose e alternative per allergia.
      </p>

      <div className="lista-antibiotici" role="listbox" aria-label="Antibiotici">
        {antibiotici.map((a) => (
          <button
            key={a.id}
            type="button"
            role="option"
            aria-selected={a.id === antibioticoId}
            className={a.id === antibioticoId ? 'antibiotico-item selezionato' : 'antibiotico-item'}
            onClick={() => setAntibioticoId(a.id)}
          >
            {a.nome}
            <span className="antibiotico-indicazione">{a.indicazione}</span>
          </button>
        ))}
      </div>

      {antibiotico && (
        <div className="risultato-antibiotico">
          {nonCompilato ? (
            <p className="avviso">
              Voce non ancora compilata dal medico (struttura di template): nessuna fonte
              assegnata, dose non mostrata.
            </p>
          ) : (
            <>
              <div className="riga-meta">
                {peso?.chiave && (
                  <span className="chip">Peso usato: {LABEL_PESO[peso.chiave] ?? peso.chiave}</span>
                )}
              </div>

              {peso?.pesoPediatricoEscluso && (
                <p className="avviso avviso-pediatrico">
                  Questo antibiotico richiederebbe il peso {peso.pesoPediatricoEscluso}, non valido
                  su un paziente pediatrico (formula per adulti): usato il peso reale.
                </p>
              )}

              {erroreCalcolo && <p className="avviso avviso-errore">{erroreCalcolo}</p>}

              {profiloIncompleto && (
                <p className="avviso">
                  Completa il profilo paziente (peso{peso?.chiave !== 'reale' ? ', altezza e sesso' : ''})
                  per calcolare la dose: serve il {LABEL_PESO[peso?.chiave] ?? peso?.chiave}.
                </p>
              )}

              {risultato && (
                <div className="formula-a-vista">
                  <p className="risultato-primario">
                    {formatoRisultato(risultato)}
                    <InfoFonte fonte={antibiotico.fonte} revisione={antibiotico.revisione} />
                  </p>
                  <p className="formula">{risultato.formula}</p>
                  {superaTetto && (
                    <p className="avviso avviso-errore">
                      Supera il tetto massimo di {doseMassima} mg: non superare questa dose.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="dettagli-antibiotico">
            {antibiotico.timing?.minuti_prima_incisione > 0 && (
              <p className="chip">Timing: {antibiotico.timing.minuti_prima_incisione} min prima dell'incisione</p>
            )}
            {antibiotico.timing?.nota && <p className="nota">{antibiotico.timing.nota}</p>}

            {antibiotico.ridose?.ogni_ore > 0 && (
              <p className="chip">Ridose: ogni {antibiotico.ridose.ogni_ore} h</p>
            )}
            {antibiotico.ridose?.sanguinamento_massivo_ml > 0 && (
              <p className="chip">
                Ridose anticipata se sanguinamento &gt; {antibiotico.ridose.sanguinamento_massivo_ml} ml
              </p>
            )}
            {antibiotico.ridose?.nota && <p className="nota">{antibiotico.ridose.nota}</p>}

            {antibiotico.allergia?.alternative.length > 0 && (
              <div className="allergia">
                <span className="nota">In caso di allergia:</span>
                {antibiotico.allergia.alternative.map((idAlt) => {
                  const alt = antibiotici.find((a) => a.id === idAlt)
                  return (
                    <button
                      key={idAlt}
                      type="button"
                      className="alternativa-item"
                      onClick={() => setAntibioticoId(idAlt)}
                    >
                      {alt?.nome ?? idAlt}
                    </button>
                  )
                })}
                {antibiotico.allergia.nota && <p className="nota">{antibiotico.allergia.nota}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// --- Profilassi chirurgica e terapia antibiotica (data/profilassi-antibiotica.json) ------
//
// Contenuto di riferimento strutturato (schede leggibili, badge bozza): le dosi sono in
// gran parte testo libero ("2 g", "15 mg/kg EV", "4,5 g ogni 6h"...), non valori puliti da
// far passare per calcolaDose/risolviPeso (il motore del Modulo Farmaci). L'unica eccezione
// e' la dose pediatrica di cefazolina (30 mg/kg, un numero pulito): quella ha un vero
// mini-calcolatore sotto, CalcCefazolinaPediatrica.

function SchedaFonte({ fonte }) {
  return (
    <div className="riga-meta">
      <InfoFonte fonte={fonte} />
    </div>
  )
}

function SezioneProfilassi({ profilassi, profile, categoria }) {
  const { prima_scelta: primaScelta, allergia_beta_lattamici: allergiaBetaLattamici, mrsa, timing_generale: timingGenerale } =
    profilassi

  return (
    <div className="riquadro-antibiotici">
      <h2 className="titolo-sezione-antibiotici">Profilassi chirurgica</h2>

      <div className="scheda-antibiotico">
        <p className="scheda-titolo-antibiotico">
          {primaScelta.farmaco[0].toUpperCase() + primaScelta.farmaco.slice(1)} (prima scelta)
        </p>
        <SchedaFonte fonte={primaScelta.fonte} />
        <p className="nota">
          {/* dose_adulto.standard ("2 g") gia' contiene l'unita: da "unita" ("g EV") si mostra
              solo la via di somministrazione, per non ripetere "g" due volte. */}
          Adulto: {primaScelta.dose_adulto.standard} {primaScelta.dose_adulto.unita.split(' ').slice(1).join(' ')} (
          {primaScelta.dose_adulto.peso_alto})
        </p>
        <p className="nota">Timing: {primaScelta.timing}</p>
        <p className="nota">Ridose intraoperatoria: {primaScelta.ridose_intraoperatoria}</p>

        <CalcCefazolinaPediatrica dosePediatrica={primaScelta.dose_pediatrica} profile={profile} categoria={categoria} />
      </div>

      <div className="scheda-antibiotico">
        <p className="scheda-titolo-antibiotico">Allergia beta-lattamici</p>
        <p className="nota">{allergiaBetaLattamici._nota}</p>
        {allergiaBetaLattamici.alternative.map((alt) => (
          <div key={alt.farmaco} className="sotto-scheda-antibiotico">
            <p className="scheda-titolo-antibiotico">{alt.farmaco[0].toUpperCase() + alt.farmaco.slice(1)}</p>
            <SchedaFonte fonte={alt.fonte} />
            <p className="nota">Adulto: {alt.dose_adulto}</p>
            <p className="nota">Pediatrico: {alt.dose_pediatrica}</p>
            <p className="nota">Timing: {alt.timing}</p>
            <p className="nota">Ridose: {alt.ridose}</p>
          </div>
        ))}
      </div>

      <div className="scheda-antibiotico">
        <p className="scheda-titolo-antibiotico">MRSA</p>
        <SchedaFonte fonte={mrsa.fonte} />
        <p className="nota">Indicazione: {mrsa.indicazione}</p>
        <p className="nota">{mrsa.farmaco}</p>
        <p className="nota">{mrsa.note}</p>
      </div>

      <div className="scheda-antibiotico">
        <p className="scheda-titolo-antibiotico">Timing generale</p>
        <SchedaFonte fonte={timingGenerale.fonte} />
        <p className="nota">Standard: {timingGenerale.standard}</p>
        <p className="nota">Vancomicina/fluorochinoloni: {timingGenerale.vancomicina_fluorochinoloni}</p>
      </div>
    </div>
  )
}

function SezioneTerapiaAntibiotica({ terapia }) {
  if (!terapia) return null

  return (
    <div className="riquadro-antibiotici">
      <h2 className="titolo-sezione-antibiotici">Terapia antibiotica</h2>
      <p className="nota">{terapia._nota}</p>

      {terapia.farmaci.map((farmaco) => (
        <div key={farmaco.id} className="scheda-antibiotico">
          <p className="scheda-titolo-antibiotico">
            {farmaco.nome} <span className="antibiotico-indicazione">{farmaco.classe}</span>
          </p>
          <SchedaFonte fonte={farmaco.fonte} />
          {Object.entries(farmaco)
            .filter(([chiave]) => !CAMPI_TERAPIA_ESCLUSI.has(chiave))
            .map(([chiave, valore]) => (
              <p className="nota" key={chiave}>
                {LABEL_CAMPO_TERAPIA[chiave] ?? chiave}: {valore}
              </p>
            ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Unica dose "pulita" (numero + unita) di tutto il blocco profilassi/terapia: vero
 * mini-calcolatore riusando risolviPeso/calcolaDose come nel resto dell'app, invece di
 * mostrarla come testo. Peso sempre reale (pediatrico): nessun conflitto col guard
 * pediatrico di pesoResolver.js, che si attiva solo per IBW/LBW.
 */
function CalcCefazolinaPediatrica({ dosePediatrica, profile, categoria }) {
  const pesoKg = profile.pesoKg

  let peso = null
  let risultato = null
  let erroreCalcolo = null

  if (pesoKg > 0) {
    peso = risolviPeso(dosePediatrica.peso, { pesoKg, ibw: null, lbw: null, bmi: null, categoria })
    try {
      risultato = calcolaDose(dosePediatrica, peso.valoreKg)
    } catch (e) {
      erroreCalcolo = e.message
    }
  }

  // "non superare la dose adulto" (nota del prontuario, testo libero in dose_adulto): 2 g
  // standard, 3 g se peso >= 120 kg (data/profilassi-antibiotica.json > prima_scelta.dose_adulto).
  // Soglia esplicitata qui in codice, stesso principio di categoriaEta.js per le fasce d'eta.
  const doseAdultoMg = pesoKg >= 120 ? 3000 : 2000
  const superaDoseAdulto = risultato && risultato.valore > doseAdultoMg

  return (
    <div className="sotto-scheda-antibiotico">
      <p className="scheda-titolo-antibiotico">Mini-calcolatore dose pediatrica</p>
      {!(pesoKg > 0) && <p className="avviso">Imposta il peso nel profilo paziente per calcolare.</p>}
      {erroreCalcolo && <p className="avviso avviso-errore">{erroreCalcolo}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{formatoRisultato(risultato)}</p>
          <p className="formula">{risultato.formula}</p>
          {peso?.chiave && <p className="nota">Peso usato: {LABEL_PESO[peso.chiave] ?? peso.chiave}</p>}
          {dosePediatrica.note && <p className="nota">{dosePediatrica.note}</p>}
          {superaDoseAdulto && (
            <p className="avviso avviso-errore">
              Supera la dose adulto ({doseAdultoMg / 1000} g): non superare la dose adulto.
            </p>
          )}
        </>
      )}
    </div>
  )
}
