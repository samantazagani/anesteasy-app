import { useEffect, useState } from 'react'
import anesteticiData from '../../data/anestetici-locali.json'
import { calcolaTossicitaAdditiva, calcolaMargineResiduo, mgMlDaPercento } from '../lib/anestesiaLocaleCalculator'
import { BadgeVerifica } from './BadgeVerifica.jsx'
import '../styles/risultato.css'
import './TossicitaAdditiva.css'

// Con AL misti la tossicita' si somma come % della dose max di ciascuno (non della dose
// massima assoluta di un solo farmaco), come da data/anestetici-locali.json > tossicita_additiva.
export function TossicitaAdditiva({ anestetici, pesoKg }) {
  const [selezionati, setSelezionati] = useState({})
  const [alMargineId, setAlMargineId] = useState(null)
  const [concMargineInput, setConcMargineInput] = useState('')

  function toggleAnestetico(id) {
    setSelezionati((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = { conAdrenalina: false, doseMg: '' }
      }
      return next
    })
  }

  function aggiornaVoce(id, patch) {
    setSelezionati((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const vociValide = Object.entries(selezionati)
    .map(([id, voce]) => ({
      anestetico: anestetici.find((a) => a.id === id),
      conAdrenalina: voce.conAdrenalina,
      pesoKg,
      doseSommistrataMg: Number(voce.doseMg),
    }))
    .filter((v) => v.anestetico && v.doseSommistrataMg > 0)

  const risultato =
    vociValide.length > 0 && pesoKg > 0 ? calcolaTossicitaAdditiva(vociValide) : null

  // L'AL scelto per il margine deve restare tra quelli attualmente in uso: se viene
  // deselezionato dalla lista sopra, si ripiega sul primo disponibile (o nessuno).
  useEffect(() => {
    if (!risultato) {
      setAlMargineId(null)
      return
    }
    if (!risultato.righe.some((r) => r.id === alMargineId)) {
      setAlMargineId(risultato.righe[0]?.id ?? null)
    }
  }, [risultato, alMargineId])

  const rigaMargine = risultato?.righe.find((r) => r.id === alMargineId) ?? null
  const concMarginePercento = concMargineInput.trim() === '' ? null : Number(concMargineInput)

  let margine = null
  let erroreMargine = null
  if (rigaMargine && concMarginePercento > 0) {
    try {
      margine = calcolaMargineResiduo({
        percentualeUsataTotale: risultato.percentualeTotale,
        doseMaxMgAlScelto: rigaMargine.tettoMg,
        concentrazioneMgMlAlScelto: mgMlDaPercento(concMarginePercento),
      })
    } catch (e) {
      erroreMargine = e.message
    }
  }

  return (
    <div className="riquadro-calcolatore" id="tossicita-additiva">
      <div className="riga-meta">
        <h2>Tossicita' additiva</h2>
        <BadgeVerifica verificato={anesteticiData.tossicita_additiva.verificato} />
      </div>
      <p className="sottotitolo">
        Seleziona gli anestetici locali usati insieme e la dose somministrata di ciascuno: la
        tossicita' si somma come percentuale del rispettivo tetto.
      </p>

      <div className="lista-anestetici" role="listbox" aria-label="Anestetici usati insieme">
        {anestetici.map((a) => (
          <button
            key={a.id}
            type="button"
            role="option"
            aria-selected={Boolean(selezionati[a.id])}
            className={selezionati[a.id] ? 'anestetico-item selezionato' : 'anestetico-item'}
            onClick={() => toggleAnestetico(a.id)}
          >
            {a.nome}
          </button>
        ))}
      </div>

      {Object.keys(selezionati).length > 0 && (
        <div className="voci-tossicita">
          {Object.entries(selezionati).map(([id, voce]) => {
            const anestetico = anestetici.find((a) => a.id === id)
            return (
              <div key={id} className="voce-tossicita">
                <span className="voce-nome">{anestetico?.nome}</span>
                <label className="toggle-adrenalina">
                  <input
                    type="checkbox"
                    checked={voce.conAdrenalina}
                    onChange={(e) => aggiornaVoce(id, { conAdrenalina: e.target.checked })}
                  />
                  con adrenalina
                </label>
                <label className="campo-numerico campo-dose">
                  Dose somministrata (mg)
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={voce.doseMg}
                    onChange={(e) => aggiornaVoce(id, { doseMg: e.target.value })}
                  />
                </label>
              </div>
            )
          })}
        </div>
      )}

      {Object.keys(selezionati).length > 0 && !(pesoKg > 0) && (
        <p className="avviso">Imposta il peso nella scheda "Profilo paziente" per calcolare.</p>
      )}

      {risultato && (
        <div className="formula-a-vista">
          <div className="tabella-scroll">
            <table className="tabella-tossicita">
              <thead>
                <tr>
                  <th>Anestetico</th>
                  <th>Tetto (min mg/kg, assoluto)</th>
                  <th>% del tetto</th>
                </tr>
              </thead>
              <tbody>
                {risultato.righe.map((riga) => (
                  <tr key={riga.id}>
                    <td>{riga.nome}</td>
                    <td>{riga.tettoMg} mg</td>
                    <td>{riga.percentuale}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={risultato.supera ? 'riga-totale supera' : 'riga-totale'}>
                  <td colSpan={2}>Totale</td>
                  <td>{risultato.percentualeTotale}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {risultato.supera && (
            <p className="avviso avviso-errore">
              La somma delle percentuali supera il 100%: rischio di tossicita' sistemica additiva.
            </p>
          )}

          <div className="scheda-margine">
            <p className="scheda-titolo-margine">Margine residuo per un AL scelto</p>
            <div className="griglia-margine">
              <label className="campo-numerico">
                Anestetico
                <select value={alMargineId ?? ''} onChange={(e) => setAlMargineId(e.target.value)}>
                  {risultato.righe.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo-numerico">
                Concentrazione (%)
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="es. 0.2"
                  value={concMargineInput}
                  onChange={(e) => setConcMargineInput(e.target.value)}
                />
              </label>
            </div>
            {erroreMargine && <p className="avviso avviso-errore">{erroreMargine}</p>}
            {margine && (
              <>
                <p className={margine.superaTetto ? 'risultato-primario risultato-errore' : 'risultato-primario'}>
                  {margine.margineMl} ml residui
                </p>
                <p className="formula">{margine.formula}</p>
                {margine.superaTetto && (
                  <p className="avviso avviso-errore">
                    Il tetto combinato è già superato: non somministrare altro anestetico locale.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
