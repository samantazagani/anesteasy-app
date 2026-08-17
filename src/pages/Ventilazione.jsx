import { useEffect, useState } from 'react'
import ventilazioneData from '../../data/ventilazione.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import {
  calcolaPBW,
  calcolaVtTarget,
  calcolaVtPerKgPBW,
  calcolaComplianceStatica,
  calcolaComplianceDinamica,
  calcolaDrivingPressure,
  calcolaMechanicalPower,
  calcolaSpazioMorto,
  calcolaPF,
  calcolaOxygenationIndex,
  calcolaO2ER,
  calcolaVO2,
  calcolaAutonomiaBombola,
  valutaLimite,
} from '../lib/ventilazioneCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import { BadgeFormulaDaVerificare } from '../components/BadgeFormulaDaVerificare.jsx'
import '../styles/risultato.css'
import './Ventilazione.css'

function trovaLimite(id) {
  return ventilazioneData.valori_limite.find((l) => l.id === id)
}

function numero(testo) {
  if (typeof testo !== 'string' || testo.trim() === '') return null
  const n = Number(testo)
  return Number.isFinite(n) ? n : null
}

function Campo({ etichetta, valore, onChange, ...props }) {
  return (
    <label className="campo-numerico">
      {etichetta}
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  )
}

/** Confronta un risultato calcolato col valore limite corrispondente (vt_kg, pplat,
 * driving_pressure, peep, ppeak): verde entro soglia/range, rosso fuori. */
function IndicatoreLimite({ valore, limite }) {
  if (valore === null || valore === undefined || !limite) return null
  const { ok, min, max } = valutaLimite(valore, limite)

  let testo
  if (min !== null && max !== null) testo = `${min}-${max}`
  else if (max !== null) testo = `≤ ${max}`
  else if (min !== null) testo = `≥ ${min}`
  else testo = ''

  return (
    <span className={ok ? 'indicatore-limite ok' : 'indicatore-limite fuori'}>
      {ok ? '✓' : '✗'} {testo} {limite.unita}
    </span>
  )
}

function Calcolatore({ titolo, badge, children }) {
  return (
    <div className="riquadro-vent">
      <div className="riga-meta">
        <p className="vent-titolo">{titolo}</p>
        {badge ?? <BadgeVerifica verificato={false} />}
      </div>
      {children}
    </div>
  )
}

export function Ventilazione() {
  const { profile } = usePatientProfile()

  const [sesso, setSesso] = useState('M')
  const [altezzaCm, setAltezzaCm] = useState('')
  const [vt, setVt] = useState('')
  const [pplat, setPplat] = useState('')
  const [ppeak, setPpeak] = useState('')
  const [peep, setPeep] = useState('')
  const [rr, setRr] = useState('')

  useEffect(() => {
    if (profile.sesso) setSesso(profile.sesso)
  }, [profile.sesso])
  useEffect(() => {
    if (profile.altezzaCm > 0) setAltezzaCm(String(profile.altezzaCm))
  }, [profile.altezzaCm])

  const altezzaN = numero(altezzaCm)
  const vtN = numero(vt)
  const pplatN = numero(pplat)
  const ppeakN = numero(ppeak)
  const peepN = numero(peep)
  const rrN = numero(rr)

  let pbw = null
  if (altezzaN !== null) {
    try {
      pbw = calcolaPBW({ sesso, altezzaCm: altezzaN })
    } catch {
      pbw = null
    }
  }

  return (
    <section id="ventilazione">
      <h1>Ventilazione</h1>
      <p className="sottotitolo">
        Riferimento rapido: calcolatori e valori limite (data/ventilazione.json). I
        parametri qui sotto alimentano più calcolatori insieme.
      </p>

      <div className="pannello-condiviso">
        <h2>Parametri condivisi</h2>
        <div className="griglia-campi-vent">
          <label className="campo-numerico">
            Sesso
            <select value={sesso} onChange={(e) => setSesso(e.target.value)}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </label>
          <Campo etichetta="Altezza (cm)" valore={altezzaCm} onChange={setAltezzaCm} />
          <Campo etichetta="Vt (ml)" valore={vt} onChange={setVt} />
          <Campo etichetta="Pplat (cmH2O)" valore={pplat} onChange={setPplat} />
          <Campo etichetta="Ppeak (cmH2O)" valore={ppeak} onChange={setPpeak} />
          <Campo etichetta="PEEP (cmH2O)" valore={peep} onChange={setPeep} />
          <Campo etichetta="RR (atti/min)" valore={rr} onChange={setRr} />
        </div>
        <div className="indicatori-condivisi">
          {pplatN !== null && (
            <span className="indicatore-riga">
              Pplat: <IndicatoreLimite valore={pplatN} limite={trovaLimite('pplat')} />
            </span>
          )}
          {peepN !== null && (
            <span className="indicatore-riga">
              PEEP: <IndicatoreLimite valore={peepN} limite={trovaLimite('peep')} />
            </span>
          )}
          {ppeakN !== null && (
            <span className="indicatore-riga">
              Ppeak: <IndicatoreLimite valore={ppeakN} limite={trovaLimite('ppeak')} />
            </span>
          )}
        </div>
      </div>

      <CalcVtPbw sesso={sesso} vtN={vtN} pbw={pbw} />
      <CalcComplianceStatica vtN={vtN} pplatN={pplatN} peepN={peepN} />
      <CalcComplianceDinamica vtN={vtN} ppeakN={ppeakN} peepN={peepN} />
      <CalcDrivingPressure pplatN={pplatN} peepN={peepN} />
      <CalcMechanicalPower rrN={rrN} vtN={vtN} ppeakN={ppeakN} pplatN={pplatN} peepN={peepN} />
      <CalcSpazioMorto />
      <CalcPF />
      <CalcOxygenationIndex />
      <CalcO2ER />
      <CalcVO2 />
      <CalcAutonomiaBombola />
    </section>
  )
}

// --- Calcolatori legati ai parametri condivisi -------------------------------------------

function CalcVtPbw({ sesso, vtN, pbw }) {
  const [mlKg, setMlKg] = useState('6')
  const mlKgN = numero(mlKg)

  let target = null
  if (pbw && mlKgN !== null) {
    try {
      target = calcolaVtTarget({ pbwKg: pbw.pbwKg, mlKg: mlKgN })
    } catch {
      target = null
    }
  }

  let attuale = null
  if (pbw && vtN !== null) {
    try {
      attuale = calcolaVtPerKgPBW({ vtMl: vtN, pbwKg: pbw.pbwKg })
    } catch {
      attuale = null
    }
  }

  return (
    <Calcolatore titolo="Vt su peso ideale (PBW)">
      {!pbw && <p className="avviso">Inserisci altezza (e sesso) nel pannello condiviso.</p>}
      {pbw && (
        <>
          <p className="risultato-primario">PBW {pbw.pbwKg} kg (sesso {sesso})</p>
          <p className="formula">{pbw.formula}</p>

          <div className="griglia-campi-vent">
            <Campo etichetta="Target (ml/kg)" valore={mlKg} onChange={setMlKg} />
          </div>
          {target && (
            <p className="nota">
              A {mlKgN} ml/kg PBW → Vt target {target.vtMl} ml
            </p>
          )}

          {attuale ? (
            <>
              <p className="risultato-primario">
                Vt attuale/PBW: {attuale.mlKg} ml/kg{' '}
                <IndicatoreLimite valore={attuale.mlKg} limite={trovaLimite('vt_kg')} />
              </p>
              <p className="formula">{attuale.formula}</p>
            </>
          ) : (
            <p className="avviso">
              Inserisci il Vt nel pannello condiviso per verificare il rapporto ml/kg PBW.
            </p>
          )}
        </>
      )}
    </Calcolatore>
  )
}

function CalcComplianceStatica({ vtN, pplatN, peepN }) {
  const pronto = vtN !== null && pplatN !== null && peepN !== null
  let risultato = null
  let errore = null
  if (pronto) {
    try {
      risultato = calcolaComplianceStatica({ vtMl: vtN, pplat: pplatN, peep: peepN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Compliance statica">
      {!pronto && <p className="avviso">Richiede Vt, Pplat e PEEP dal pannello condiviso.</p>}
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.compliance} ml/cmH2O</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcComplianceDinamica({ vtN, ppeakN, peepN }) {
  const pronto = vtN !== null && ppeakN !== null && peepN !== null
  let risultato = null
  let errore = null
  if (pronto) {
    try {
      risultato = calcolaComplianceDinamica({ vtMl: vtN, ppeak: ppeakN, peep: peepN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Compliance dinamica">
      {!pronto && <p className="avviso">Richiede Vt, Ppeak e PEEP dal pannello condiviso.</p>}
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.compliance} ml/cmH2O</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcDrivingPressure({ pplatN, peepN }) {
  const pronto = pplatN !== null && peepN !== null
  let risultato = null
  let errore = null
  if (pronto) {
    try {
      risultato = calcolaDrivingPressure({ pplat: pplatN, peep: peepN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Driving pressure">
      {!pronto && <p className="avviso">Richiede Pplat e PEEP dal pannello condiviso.</p>}
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">
            {risultato.drivingPressure} cmH2O{' '}
            <IndicatoreLimite valore={risultato.drivingPressure} limite={trovaLimite('driving_pressure')} />
          </p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcMechanicalPower({ rrN, vtN, ppeakN, pplatN, peepN }) {
  const pronto = [rrN, vtN, ppeakN, pplatN, peepN].every((v) => v !== null)
  let risultato = null
  let errore = null
  if (pronto) {
    try {
      risultato = calcolaMechanicalPower({ rr: rrN, vtMl: vtN, ppeak: ppeakN, pplat: pplatN, peep: peepN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore
      titolo="Mechanical power"
      badge={<BadgeFormulaDaVerificare>coefficiente 0.098 non confermato con la fonte</BadgeFormulaDaVerificare>}
    >
      {!pronto && <p className="avviso">Richiede RR, Vt, Ppeak, Pplat e PEEP dal pannello condiviso.</p>}
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.power} J/min</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Equazione di Gattinoni.</p>
    </Calcolatore>
  )
}

// --- Calcolatori con input locali (gas ematici, monitoraggio) ---------------------------

function CalcSpazioMorto() {
  const [paCO2, setPaCO2] = useState('')
  const [petCO2, setPetCO2] = useState('')

  let risultato = null
  let errore = null
  const p1 = numero(paCO2)
  const p2 = numero(petCO2)
  if (p1 !== null && p2 !== null) {
    try {
      risultato = calcolaSpazioMorto({ paCO2: p1, petCO2: p2 })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Spazio morto (Vd/Vt)">
      <div className="griglia-campi-vent">
        <Campo etichetta="PaCO2 (mmHg)" valore={paCO2} onChange={setPaCO2} />
        <Campo etichetta="PetCO2 (mmHg)" valore={petCO2} onChange={setPetCO2} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">Vd/Vt {risultato.vdVt}</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Bohr-Enghoff.</p>
    </Calcolatore>
  )
}

function CalcPF() {
  const [paO2, setPaO2] = useState('')
  const [fiO2, setFiO2] = useState('')

  let risultato = null
  let errore = null
  const p = numero(paO2)
  const f = numero(fiO2)
  if (p !== null && f !== null) {
    try {
      risultato = calcolaPF({ paO2: p, fiO2: f })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="P/F">
      <div className="griglia-campi-vent">
        <Campo etichetta="PaO2 (mmHg)" valore={paO2} onChange={setPaO2} />
        <Campo etichetta="FiO2 (frazione 0-1)" valore={fiO2} onChange={setFiO2} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">P/F {risultato.pf}</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcOxygenationIndex() {
  const [fiO2, setFiO2] = useState('')
  const [pawMedia, setPawMedia] = useState('')
  const [paO2, setPaO2] = useState('')

  let risultato = null
  let errore = null
  const f = numero(fiO2)
  const pm = numero(pawMedia)
  const p = numero(paO2)
  if (f !== null && pm !== null && p !== null) {
    try {
      risultato = calcolaOxygenationIndex({ fiO2: f, pawMedia: pm, paO2: p })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Indice di ossigenazione">
      <div className="griglia-campi-vent">
        <Campo etichetta="FiO2 (frazione 0-1)" valore={fiO2} onChange={setFiO2} />
        <Campo etichetta="Paw media (cmH2O)" valore={pawMedia} onChange={setPawMedia} />
        <Campo etichetta="PaO2 (mmHg)" valore={paO2} onChange={setPaO2} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">OI {risultato.oi}</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcO2ER() {
  const [hb, setHb] = useState('')
  const [saO2, setSaO2] = useState('')
  const [paO2, setPaO2] = useState('')
  const [svO2, setSvO2] = useState('')
  const [pvO2, setPvO2] = useState('')

  let risultato = null
  let errore = null
  const h = numero(hb)
  const sa = numero(saO2)
  const pa = numero(paO2)
  const sv = numero(svO2)
  const pv = numero(pvO2)
  if ([h, sa, pa, sv, pv].every((v) => v !== null)) {
    try {
      risultato = calcolaO2ER({ hb: h, saO2: sa, paO2: pa, svO2: sv, pvO2: pv })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Estrazione O2 (O2ER)">
      <div className="griglia-campi-vent">
        <Campo etichetta="Hb (g/dL)" valore={hb} onChange={setHb} />
        <Campo etichetta="SaO2 (frazione 0-1)" valore={saO2} onChange={setSaO2} />
        <Campo etichetta="PaO2 (mmHg)" valore={paO2} onChange={setPaO2} />
        <Campo etichetta="SvO2 (frazione 0-1)" valore={svO2} onChange={setSvO2} />
        <Campo etichetta="PvO2 (mmHg)" valore={pvO2} onChange={setPvO2} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">O2ER {risultato.o2er}</p>
          <p className="formula">{risultato.formula}</p>
          <p className="nota">
            CaO2 {risultato.caO2} ml/dL · CvO2 {risultato.cvO2} ml/dL
          </p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcVO2() {
  const [co, setCo] = useState('')
  const [hb, setHb] = useState('')
  const [saO2, setSaO2] = useState('')
  const [paO2, setPaO2] = useState('')
  const [svO2, setSvO2] = useState('')
  const [pvO2, setPvO2] = useState('')

  let risultato = null
  let errore = null
  const c = numero(co)
  const h = numero(hb)
  const sa = numero(saO2)
  const pa = numero(paO2)
  const sv = numero(svO2)
  const pv = numero(pvO2)
  if ([c, h, sa, pa, sv, pv].every((v) => v !== null)) {
    try {
      risultato = calcolaVO2({ co: c, hb: h, saO2: sa, paO2: pa, svO2: sv, pvO2: pv })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Consumo O2 (VO2)">
      <div className="griglia-campi-vent">
        <Campo etichetta="CO (L/min)" valore={co} onChange={setCo} />
        <Campo etichetta="Hb (g/dL)" valore={hb} onChange={setHb} />
        <Campo etichetta="SaO2 (frazione 0-1)" valore={saO2} onChange={setSaO2} />
        <Campo etichetta="PaO2 (mmHg)" valore={paO2} onChange={setPaO2} />
        <Campo etichetta="SvO2 (frazione 0-1)" valore={svO2} onChange={setSvO2} />
        <Campo etichetta="PvO2 (mmHg)" valore={pvO2} onChange={setPvO2} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">VO2 {risultato.vo2} ml/min</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Fick.</p>
    </Calcolatore>
  )
}

function CalcAutonomiaBombola() {
  const [pressioneBar, setPressioneBar] = useState('')
  const [capacitaL, setCapacitaL] = useState('')
  const [flussoLMin, setFlussoLMin] = useState('')

  let risultato = null
  let errore = null
  const p = numero(pressioneBar)
  const c = numero(capacitaL)
  const f = numero(flussoLMin)
  if (p !== null && c !== null && f !== null) {
    try {
      risultato = calcolaAutonomiaBombola({ pressioneBar: p, capacitaL: c, flussoLMin: f })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Autonomia bombola O2">
      <div className="griglia-campi-vent">
        <Campo etichetta="Pressione (bar)" valore={pressioneBar} onChange={setPressioneBar} />
        <Campo etichetta="Capacità bombola (L)" valore={capacitaL} onChange={setCapacitaL} />
        <Campo etichetta="Flusso (L/min)" valore={flussoLMin} onChange={setFlussoLMin} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.durataMin} min</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}
