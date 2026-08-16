import { useEffect, useMemo, useState } from 'react'
import farmaciData from '../../data/farmaci.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { categoriaEta } from '../lib/categoriaEta'
import { risolviPeso } from '../lib/pesoResolver'
import { selezionaDose, etichettaVariante } from '../lib/selezioneDose'
import { calcolaDose } from '../lib/doseCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import { CalcolatoreInfusioneManuale } from '../components/CalcolatoreInfusioneManuale.jsx'
import '../styles/risultato.css'
import './CalcolatoreDoseBolo.css'

const LABEL_CONTESTO = {
  induzione: 'Induzione',
  sedazione: 'Sedazione',
  mantenimento: 'Mantenimento',
  premedicazione: 'Premedicazione',
  analgesia: 'Analgesia',
  neuroassiale: 'Neuroassiale',
  tci_induzione: 'TCI · induzione',
  tci_mantenimento: 'TCI · mantenimento',
  carico: 'Carico',
  infusione: 'Infusione',
  bolo: 'Bolo',
  intubazione: 'Intubazione',
  rsi: 'RSI (sequenza rapida)',
  reversal: 'Reversal',
  arresto: 'Arresto',
  anafilassi: 'Anafilassi',
  bradicardia: 'Bradicardia',
  crisi_ipertensiva: 'Crisi ipertensiva',
  antiaritmico: 'Antiaritmico',
  infusione_continua: 'Infusione continua',
  tampone: 'Tampone',
  ipertermia_maligna: 'Ipertermia maligna',
  antagonista: 'Antagonista',
  neonato: 'Neonato',
}

const LABEL_PESO = { reale: 'peso reale', IBW: 'IBW (peso ideale)', LBW: 'LBW (peso magro)' }

function contestiDisponibili(dosi) {
  const visti = new Set()
  const risultato = []
  for (const d of dosi) {
    if (!visti.has(d.contesto)) {
      visti.add(d.contesto)
      risultato.push(d.contesto)
    }
  }
  return risultato
}

export function CalcolatoreDoseBolo() {
  const { profile, bmi, ibw, lbw } = usePatientProfile()
  const farmaci = farmaciData.farmaci

  const [ricerca, setRicerca] = useState('')
  const [farmacoId, setFarmacoId] = useState('propofol')
  const [contesto, setContesto] = useState('induzione')
  const [varianteIndice, setVarianteIndice] = useState(0)

  const farmacoSelezionato = farmaci.find((f) => f.id === farmacoId) ?? null

  const risultatiRicerca = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    if (!q) return farmaci
    return farmaci.filter((f) => f.nome.toLowerCase().includes(q))
  }, [farmaci, ricerca])

  function selezionaFarmaco(f) {
    setFarmacoId(f.id)
    const contesti = contestiDisponibili(f.dosi)
    setContesto(contesti[0] ?? '')
  }

  const contesti = farmacoSelezionato ? contestiDisponibili(farmacoSelezionato.dosi) : []
  const categoria = categoriaEta(profile.eta)

  const selezione = farmacoSelezionato
    ? selezionaDose(farmacoSelezionato.dosi, contesto, categoria)
    : { candidati: [], fasciaUsata: null, fallback: false }

  // Ogni volta che cambia farmaco o contesto, si riparte dalla prima variante disponibile.
  useEffect(() => {
    setVarianteIndice(0)
  }, [farmacoId, contesto])

  const doseScelta = selezione.candidati[varianteIndice] ?? selezione.candidati[0] ?? null

  const derivati = { pesoKg: profile.pesoKg, ibw, lbw, bmi, categoria }

  let peso = null
  let risultato = null
  let erroreCalcolo = null
  let profiloIncompleto = false
  let nessunValoreNumerico = false

  if (doseScelta && !doseScelta.non_applicabile) {
    const haValoreONumero = doseScelta.valore !== undefined || (doseScelta.min !== undefined && doseScelta.max !== undefined)

    if (!haValoreONumero) {
      nessunValoreNumerico = true
    } else {
      peso = risolviPeso(doseScelta.peso, derivati)
      const richiedePeso = doseScelta.unita.includes('/kg')

      if (richiedePeso && !(peso.valoreKg > 0)) {
        profiloIncompleto = true
      } else {
        try {
          risultato = calcolaDose(doseScelta, peso.valoreKg)
        } catch (e) {
          erroreCalcolo = e.message
        }
      }
    }
  }

  return (
    <section id="calcolatore-dose">
      <h1>Farmaci · Calcolatore dose</h1>

      <div className="ricerca-farmaco">
        <label htmlFor="ricerca-farmaco-input">Cerca farmaco</label>
        <input
          id="ricerca-farmaco-input"
          type="search"
          placeholder="es. propofol"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
        />
        <div className="lista-farmaci" role="listbox" aria-label="Farmaci">
          {risultatiRicerca.map((f) => (
            <button
              key={f.id}
              type="button"
              role="option"
              aria-selected={f.id === farmacoId}
              className={f.id === farmacoId ? 'farmaco-item selezionato' : 'farmaco-item'}
              onClick={() => selezionaFarmaco(f)}
            >
              {f.nome}
              <span className="farmaco-classe">{f.classe}</span>
            </button>
          ))}
          {risultatiRicerca.length === 0 && <p className="nessun-risultato">Nessun farmaco trovato.</p>}
        </div>
      </div>

      {farmacoSelezionato && (
        <div className="dettaglio-farmaco">
          <h2>{farmacoSelezionato.nome}</h2>

          <div className="contesti" role="tablist" aria-label="Contesto clinico">
            {contesti.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={c === contesto}
                className={c === contesto ? 'contesto-item selezionato' : 'contesto-item'}
                onClick={() => setContesto(c)}
              >
                {LABEL_CONTESTO[c] ?? c}
              </button>
            ))}
          </div>

          {selezione.candidati.length > 1 && (
            <div className="varianti" role="tablist" aria-label="Variante">
              {selezione.candidati.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === varianteIndice}
                  className={i === varianteIndice ? 'variante-item selezionato' : 'variante-item'}
                  onClick={() => setVarianteIndice(i)}
                >
                  {etichettaVariante(d, i)}
                </button>
              ))}
            </div>
          )}

          <div className="risultato-dose">
            {!doseScelta && <p className="avviso">Nessun dosaggio disponibile per questo contesto.</p>}

            {doseScelta?.non_applicabile && (
              <p className="avviso">Non applicabile{doseScelta.motivo ? `: ${doseScelta.motivo}` : '.'}</p>
            )}

            {nessunValoreNumerico && (
              <p className="avviso">
                Nessun valore numerico per questo contesto{doseScelta.note ? `: ${doseScelta.note}` : '.'}
              </p>
            )}

            {doseScelta && !doseScelta.non_applicabile && !nessunValoreNumerico && (
              <>
                <div className="riga-meta">
                  <span className="chip">
                    Fascia età: {selezione.fasciaUsata}
                    {!categoria && ' (età non inserita, uso adulto)'}
                  </span>
                  {peso?.chiave && (
                    <span className="chip">Peso usato: {LABEL_PESO[peso.chiave] ?? peso.chiave}</span>
                  )}
                  {doseScelta.via && <span className="chip">Via: {doseScelta.via}</span>}
                  <BadgeVerifica verificato={doseScelta.verificato} />
                </div>

                {selezione.fallback && categoria === 'anziano' && doseScelta.aggiustamento_anziano && (
                  <p className="avviso avviso-anziano">
                    Nessuna voce dedicata per l'anziano in questo contesto: mostrato il dosaggio adulto.
                    Aggiustamento suggerito: {doseScelta.aggiustamento_anziano}
                  </p>
                )}

                {selezione.fallback && categoria === 'pediatrico' && (
                  <p className="avviso avviso-pediatrico">
                    Nessuna voce pediatrica dedicata per questo contesto (Modulo pediatria non ancora
                    disponibile): mostrato il dosaggio adulto come riferimento, non idoneo per la
                    prescrizione pediatrica senza verifica clinica.
                    {doseScelta.note ? ` Nota: ${doseScelta.note}` : ''}
                  </p>
                )}

                {peso?.pesoPediatricoEscluso && (
                  <p className="avviso avviso-pediatrico">
                    Questo farmaco richiederebbe il peso {peso.pesoPediatricoEscluso}, non valido su un
                    paziente pediatrico (formula per adulti): usato il peso reale.
                  </p>
                )}

                {erroreCalcolo && <p className="avviso avviso-errore">{erroreCalcolo}</p>}

                {risultato && (
                  <div className="formula-a-vista">
                    <p className="formula">{risultato.formula}</p>
                    {/* se la nota e' gia' mostrata come etichetta della variante (sugammadex ecc.), non ripeterla */}
                    {doseScelta.note && !(selezione.candidati.length > 1 && !doseScelta.via) && (
                      <p className="nota">{doseScelta.note}</p>
                    )}
                    {doseScelta.fonte && (
                      <p className="fonte">
                        Fonte: {doseScelta.fonte}
                        {doseScelta.pagina ? `, p. ${doseScelta.pagina}` : ''}
                        {doseScelta.revisione ? ` · rev. ${doseScelta.revisione}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {profiloIncompleto && (
                  <p className="avviso">
                    Completa il profilo paziente (peso
                    {peso?.chiave !== 'reale' ? ', altezza e sesso' : ''}) per calcolare la dose:
                    serve il {LABEL_PESO[peso?.chiave] ?? peso?.chiave}.
                  </p>
                )}
              </>
            )}
          </div>

          {farmacoSelezionato.calcolatore_infusione && (
            <CalcolatoreInfusioneManuale
              config={farmacoSelezionato.calcolatore_infusione}
              pesoKg={profile.pesoKg}
            />
          )}
        </div>
      )}
    </section>
  )
}
