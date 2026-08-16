import { useState } from 'react'
import antibioticiData from '../../data/antibiotici_template.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { risolviPeso } from '../lib/pesoResolver'
import { calcolaDose } from '../lib/doseCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './CalcolatoreAntibiotici.css'

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)', LBW: 'LBW (peso magro)' }

export function CalcolatoreAntibiotici() {
  const { profile, bmi, ibw, lbw } = usePatientProfile()
  const antibiotici = antibioticiData.antibiotici

  const [antibioticoId, setAntibioticoId] = useState(antibiotici[0]?.id ?? null)
  const antibiotico = antibiotici.find((a) => a.id === antibioticoId) ?? null

  // Finche' il medico non assegna una fonte reale, la voce e' un placeholder di
  // struttura: non va mai mostrato un numero calcolato come se fosse una dose vera.
  const nonCompilato = antibiotico ? !antibiotico.fonte : true

  const categoria = categoriaEta(profile.eta)
  const derivati = { pesoKg: profile.pesoKg, ibw, lbw, bmi, categoria }

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
      <h1>Profilassi antibiotica</h1>
      <p className="sottotitolo">
        Dose su peso/BMI, timing di somministrazione, ridose e alternative per allergia.
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
                <BadgeVerifica verificato={antibiotico.verificato} />
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
                  <p className="formula">{risultato.formula}</p>
                  {superaTetto && (
                    <p className="avviso avviso-errore">
                      Supera il tetto massimo di {doseMassima} mg: non superare questa dose.
                    </p>
                  )}
                  {antibiotico.fonte && (
                    <p className="fonte">
                      Fonte: {antibiotico.fonte}
                      {antibiotico.revisione ? ` · rev. ${antibiotico.revisione}` : ''}
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
