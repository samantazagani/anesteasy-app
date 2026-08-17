import { useEffect, useState } from 'react'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaInfusione, calcolaMlOrariDaConcentrazione } from '../lib/infusionCalculator'
import {
  calcolaSodioCorretto,
  calcolaDeficitSodio,
  calcolaDeficitPotassio,
  calcolaAnionGap,
  calcolaGapOsmolare,
  calcolaDeficitIdrico,
  calcolaClearanceCreatinina,
  calcolaEGFRCKDEPI,
  calcolaCalcioCorretto,
  calcolaWinter,
  calcolaQTc,
  calcolaAaGradient,
  calcolaMAP,
  calcolaShockIndex,
  calcolaCPP,
} from '../lib/calcolatoriTI'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './CalcolatoriTI.css'

const CATEGORIE = [
  { id: 'elettroliti', label: 'Elettroliti' },
  { id: 'respiratorio', label: 'Respiratorio' },
  { id: 'emodinamica', label: 'Emodinamica' },
  { id: 'renale', label: 'Renale' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'altro', label: 'Altro' },
]

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

function CampoSesso({ etichetta, valore, onChange }) {
  return (
    <label className="campo-numerico">
      {etichetta}
      <select value={valore} onChange={(e) => onChange(e.target.value)}>
        <option value="M">M</option>
        <option value="F">F</option>
      </select>
    </label>
  )
}

function Calcolatore({ titolo, children }) {
  return (
    <div className="riquadro-calcolatore-ti">
      <div className="riga-meta">
        <p className="calcolatore-titolo">{titolo}</p>
        <BadgeVerifica verificato={false} />
      </div>
      {children}
    </div>
  )
}

export function CalcolatoriTI() {
  const { profile } = usePatientProfile()
  const [categoria, setCategoria] = useState('elettroliti')
  // Permette a CalcCPP di precompilare il campo MAP con l'ultimo valore calcolato in
  // CalcMAP (stessa sezione Emodinamica): i calcolatori restano indipendenti, questo e'
  // solo un suggerimento di comodita', il campo resta modificabile.
  const [ultimoMap, setUltimoMap] = useState(null)

  return (
    <section id="calcolatori-ti">
      <h1>Calcolatori TI</h1>
      <p className="sottotitolo">
        17 calcolatori indipendenti (data/calcolatori-ti.json): valori di laboratorio da
        inserire manualmente ogni volta, tranne peso/età/sesso già noti dal profilo.
      </p>

      <nav className="categorie-ti" role="tablist" aria-label="Categoria">
        {CATEGORIE.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === categoria}
            className={c.id === categoria ? 'categoria-item selezionato' : 'categoria-item'}
            onClick={() => setCategoria(c.id)}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <div hidden={categoria !== 'elettroliti'}>
        <CalcSodioCorretto />
        <CalcDeficitSodio profile={profile} />
        <CalcDeficitPotassio />
        <CalcAnionGap />
        <CalcGapOsmolare />
        <CalcDeficitIdrico profile={profile} />
        <CalcCalcioCorretto />
      </div>

      <div hidden={categoria !== 'respiratorio'}>
        <CalcAaGradient />
        <CalcWinter />
      </div>

      <div hidden={categoria !== 'emodinamica'}>
        <CalcMAP onMapCalcolato={setUltimoMap} />
        <CalcShockIndex />
        <CalcCPP mapPrecompilata={ultimoMap} />
      </div>

      <div hidden={categoria !== 'renale'}>
        <CalcClearanceCreatinina profile={profile} />
        <CalcEGFR profile={profile} />
      </div>

      <div hidden={categoria !== 'cardio'}>
        <CalcQTc />
      </div>

      <div hidden={categoria !== 'altro'}>
        <CalcGamma profile={profile} />
        <CalcInfusioneOraria />
      </div>
    </section>
  )
}

// --- Elettroliti -------------------------------------------------------------------------

function CalcSodioCorretto() {
  const [naMisurato, setNaMisurato] = useState('')
  const [glicemia, setGlicemia] = useState('')

  let risultato = null
  let errore = null
  const na = numero(naMisurato)
  const gli = numero(glicemia)
  if (na !== null && gli !== null) {
    try {
      risultato = calcolaSodioCorretto({ naMisurato: na, glicemia: gli })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Sodio corretto per glicemia">
      <div className="griglia-campi-ti">
        <Campo etichetta="Na misurato (mmol/L)" valore={naMisurato} onChange={setNaMisurato} />
        <Campo etichetta="Glicemia (mg/dL)" valore={glicemia} onChange={setGlicemia} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.naCorretto} mmol/L</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Alcuni usano 0.024 per glicemie molto alte.</p>
    </Calcolatore>
  )
}

function CalcDeficitSodio({ profile }) {
  const [pesoKg, setPesoKg] = useState('')
  const [sesso, setSesso] = useState('M')
  const [naAttuale, setNaAttuale] = useState('')
  const [naTarget, setNaTarget] = useState('')

  useEffect(() => {
    if (profile.pesoKg > 0) setPesoKg(String(profile.pesoKg))
  }, [profile.pesoKg])
  useEffect(() => {
    if (profile.sesso) setSesso(profile.sesso)
  }, [profile.sesso])

  let risultato = null
  let errore = null
  const peso = numero(pesoKg)
  const attuale = numero(naAttuale)
  const target = numero(naTarget)
  if (peso !== null && attuale !== null && target !== null) {
    try {
      risultato = calcolaDeficitSodio({ pesoKg: peso, sesso, naAttuale: attuale, naTarget: target })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Deficit di sodio">
      <div className="griglia-campi-ti">
        <Campo etichetta="Peso (kg)" valore={pesoKg} onChange={setPesoKg} />
        <CampoSesso etichetta="Sesso" valore={sesso} onChange={setSesso} />
        <Campo etichetta="Na attuale (mmol/L)" valore={naAttuale} onChange={setNaAttuale} />
        <Campo etichetta="Na target (mmol/L)" valore={naTarget} onChange={setNaTarget} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.deficitMmol} mmol</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Correggere max 8-10 mmol/L per 24h.</p>
    </Calcolatore>
  )
}

function CalcDeficitPotassio() {
  const [kAttuale, setKAttuale] = useState('')

  let risultato = null
  let errore = null
  const k = numero(kAttuale)
  if (k !== null) {
    try {
      risultato = calcolaDeficitPotassio({ kAttuale: k })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Deficit di potassio (stima)">
      <div className="griglia-campi-ti">
        <Campo etichetta="K attuale (mmol/L)" valore={kAttuale} onChange={setKAttuale} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">
            {risultato.deficitMinMmol}-{risultato.deficitMaxMmol} mmol
          </p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Stima grossolana: guidare con emogas seriati.</p>
    </Calcolatore>
  )
}

function CalcAnionGap() {
  const [na, setNa] = useState('')
  const [cl, setCl] = useState('')
  const [hco3, setHco3] = useState('')
  const [albumina, setAlbumina] = useState('')

  let risultato = null
  let errore = null
  const naN = numero(na)
  const clN = numero(cl)
  const hco3N = numero(hco3)
  const albN = numero(albumina)
  if (naN !== null && clN !== null && hco3N !== null) {
    try {
      risultato = calcolaAnionGap({ na: naN, cl: clN, hco3: hco3N, albumina: albN ?? undefined })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Anion gap">
      <div className="griglia-campi-ti">
        <Campo etichetta="Na (mmol/L)" valore={na} onChange={setNa} />
        <Campo etichetta="Cl (mmol/L)" valore={cl} onChange={setCl} />
        <Campo etichetta="HCO3 (mmol/L)" valore={hco3} onChange={setHco3} />
        <Campo etichetta="Albumina (g/dL, opzionale)" valore={albumina} onChange={setAlbumina} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">AG {risultato.agCorretto ?? risultato.ag} mmol/L</p>
          <p className="formula">{risultato.formula}</p>
          {risultato.formulaCorretto && <p className="formula">{risultato.formulaCorretto}</p>}
        </>
      )}
      <p className="nota">Normale 8-12.</p>
    </Calcolatore>
  )
}

function CalcGapOsmolare() {
  const [na, setNa] = useState('')
  const [glicemia, setGlicemia] = useState('')
  const [bun, setBun] = useState('')
  const [osmMisurata, setOsmMisurata] = useState('')

  let risultato = null
  let errore = null
  const naN = numero(na)
  const gliN = numero(glicemia)
  const bunN = numero(bun)
  const osmN = numero(osmMisurata)
  if (naN !== null && gliN !== null && bunN !== null && osmN !== null) {
    try {
      risultato = calcolaGapOsmolare({ na: naN, glicemia: gliN, bun: bunN, osmMisurata: osmN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Gap osmolare">
      <div className="griglia-campi-ti">
        <Campo etichetta="Na (mmol/L)" valore={na} onChange={setNa} />
        <Campo etichetta="Glicemia (mg/dL)" valore={glicemia} onChange={setGlicemia} />
        <Campo etichetta="BUN (mg/dL)" valore={bun} onChange={setBun} />
        <Campo etichetta="Osmolarità misurata (mOsm/L)" valore={osmMisurata} onChange={setOsmMisurata} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">Gap {risultato.gap} mOsm/L</p>
          <p className="formula">{risultato.formulaCalcolata}</p>
          <p className="formula">{risultato.formulaGap}</p>
        </>
      )}
      <p className="nota">Normale &lt;10.</p>
    </Calcolatore>
  )
}

function CalcDeficitIdrico({ profile }) {
  const [pesoKg, setPesoKg] = useState('')
  const [sesso, setSesso] = useState('M')
  const [naAttuale, setNaAttuale] = useState('')

  useEffect(() => {
    if (profile.pesoKg > 0) setPesoKg(String(profile.pesoKg))
  }, [profile.pesoKg])
  useEffect(() => {
    if (profile.sesso) setSesso(profile.sesso)
  }, [profile.sesso])

  let risultato = null
  let errore = null
  const peso = numero(pesoKg)
  const attuale = numero(naAttuale)
  if (peso !== null && attuale !== null) {
    try {
      risultato = calcolaDeficitIdrico({ pesoKg: peso, sesso, naAttuale: attuale })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Deficit idrico (ipernatriemia)">
      <div className="griglia-campi-ti">
        <Campo etichetta="Peso (kg)" valore={pesoKg} onChange={setPesoKg} />
        <CampoSesso etichetta="Sesso" valore={sesso} onChange={setSesso} />
        <Campo etichetta="Na attuale (mmol/L)" valore={naAttuale} onChange={setNaAttuale} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.deficitL} L</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcCalcioCorretto() {
  const [ca, setCa] = useState('')
  const [albumina, setAlbumina] = useState('')

  let risultato = null
  let errore = null
  const caN = numero(ca)
  const albN = numero(albumina)
  if (caN !== null && albN !== null) {
    try {
      risultato = calcolaCalcioCorretto({ ca: caN, albumina: albN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Calcio corretto per albumina">
      <div className="griglia-campi-ti">
        <Campo etichetta="Ca misurato (mg/dL)" valore={ca} onChange={setCa} />
        <Campo etichetta="Albumina (g/dL)" valore={albumina} onChange={setAlbumina} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.caCorretto} mg/dL</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

// --- Respiratorio ------------------------------------------------------------------------

function CalcAaGradient() {
  const [fiO2, setFiO2] = useState('0.21')
  const [patm, setPatm] = useState('760')
  const [paCO2, setPaCO2] = useState('')
  const [paO2, setPaO2] = useState('')

  let risultato = null
  let errore = null
  const fiO2N = numero(fiO2)
  const patmN = numero(patm)
  const paCO2N = numero(paCO2)
  const paO2N = numero(paO2)
  if (fiO2N !== null && patmN !== null && paCO2N !== null && paO2N !== null) {
    try {
      risultato = calcolaAaGradient({ fiO2: fiO2N, patm: patmN, paCO2: paCO2N, paO2: paO2N })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Gradiente Alveolo-arterioso (A-a)">
      <div className="griglia-campi-ti">
        <Campo etichetta="FiO2 (frazione 0-1)" valore={fiO2} onChange={setFiO2} />
        <Campo etichetta="Patm (mmHg)" valore={patm} onChange={setPatm} />
        <Campo etichetta="PaCO2 (mmHg)" valore={paCO2} onChange={setPaCO2} />
        <Campo etichetta="PaO2 (mmHg)" valore={paO2} onChange={setPaO2} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">A-a {risultato.aa} mmHg</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Normale ~ età/4 + 4.</p>
    </Calcolatore>
  )
}

function CalcWinter() {
  const [hco3, setHco3] = useState('')

  let risultato = null
  let errore = null
  const hco3N = numero(hco3)
  if (hco3N !== null) {
    try {
      risultato = calcolaWinter({ hco3: hco3N })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Compenso respiratorio atteso (Winter)">
      <div className="griglia-campi-ti">
        <Campo etichetta="HCO3 (mmol/L)" valore={hco3} onChange={setHco3} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">
            {risultato.attesoMin}-{risultato.attesoMax} mmHg
          </p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Per acidosi metabolica.</p>
    </Calcolatore>
  )
}

// --- Emodinamica ---------------------------------------------------------------------------

function CalcMAP({ onMapCalcolato }) {
  const [pas, setPas] = useState('')
  const [pad, setPad] = useState('')

  let risultato = null
  let errore = null
  const pasN = numero(pas)
  const padN = numero(pad)
  if (pasN !== null && padN !== null) {
    try {
      risultato = calcolaMAP({ pas: pasN, pad: padN })
    } catch (e) {
      errore = e.message
    }
  }

  useEffect(() => {
    if (risultato) onMapCalcolato?.(risultato.map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risultato?.map])

  return (
    <Calcolatore titolo="Pressione arteriosa media (MAP)">
      <div className="griglia-campi-ti">
        <Campo etichetta="PAS (mmHg)" valore={pas} onChange={setPas} />
        <Campo etichetta="PAD (mmHg)" valore={pad} onChange={setPad} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">MAP {risultato.map} mmHg</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcShockIndex() {
  const [fc, setFc] = useState('')
  const [pas, setPas] = useState('')

  let risultato = null
  let errore = null
  const fcN = numero(fc)
  const pasN = numero(pas)
  if (fcN !== null && pasN !== null) {
    try {
      risultato = calcolaShockIndex({ fc: fcN, pas: pasN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Shock index">
      <div className="griglia-campi-ti">
        <Campo etichetta="FC (bpm)" valore={fc} onChange={setFc} />
        <Campo etichetta="PAS (mmHg)" valore={pas} onChange={setPas} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">SI {risultato.si}</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Normale 0.5-0.7; &gt;0.9 allarme.</p>
    </Calcolatore>
  )
}

function CalcCPP({ mapPrecompilata }) {
  const [map, setMap] = useState('')
  const [icp, setIcp] = useState('')

  // Precompila con l'ultimo MAP calcolato in CalcMAP (stessa categoria Emodinamica), ma
  // solo se il campo e' ancora vuoto: un valore digitato a mano qui non viene sovrascritto
  // da un nuovo calcolo di MAP fatto sopra.
  useEffect(() => {
    if (mapPrecompilata > 0 && map.trim() === '') setMap(String(mapPrecompilata))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPrecompilata])

  let risultato = null
  let errore = null
  const mapN = numero(map)
  const icpN = numero(icp)
  if (mapN !== null && icpN !== null) {
    try {
      risultato = calcolaCPP({ map: mapN, icp: icpN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Pressione di perfusione cerebrale (CPP)">
      <div className="griglia-campi-ti">
        <Campo etichetta="MAP (mmHg)" valore={map} onChange={setMap} />
        <Campo etichetta="ICP (mmHg)" valore={icp} onChange={setIcp} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">CPP {risultato.cpp} mmHg</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">
        Target tipico 60-70 mmHg. MAP misurata a livello del trago.
        {mapPrecompilata > 0 && ' MAP precompilata dal calcolo MAP sopra: modificabile.'}
      </p>
    </Calcolatore>
  )
}

// --- Renale ----------------------------------------------------------------------------

function CalcClearanceCreatinina({ profile }) {
  const [eta, setEta] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [sesso, setSesso] = useState('M')
  const [creatinina, setCreatinina] = useState('')

  useEffect(() => {
    if (profile.eta >= 0) setEta(String(profile.eta))
  }, [profile.eta])
  useEffect(() => {
    if (profile.pesoKg > 0) setPesoKg(String(profile.pesoKg))
  }, [profile.pesoKg])
  useEffect(() => {
    if (profile.sesso) setSesso(profile.sesso)
  }, [profile.sesso])

  let risultato = null
  let errore = null
  const etaN = numero(eta)
  const pesoN = numero(pesoKg)
  const creatN = numero(creatinina)
  if (etaN !== null && pesoN !== null && creatN !== null) {
    try {
      risultato = calcolaClearanceCreatinina({ eta: etaN, pesoKg: pesoN, creatinina: creatN, sesso })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Clearance creatinina (Cockcroft-Gault)">
      <div className="griglia-campi-ti">
        <Campo etichetta="Età (anni)" valore={eta} onChange={setEta} />
        <Campo etichetta="Peso (kg)" valore={pesoKg} onChange={setPesoKg} />
        <CampoSesso etichetta="Sesso" valore={sesso} onChange={setSesso} />
        <Campo etichetta="Creatinina (mg/dL)" valore={creatinina} onChange={setCreatinina} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.clcrMlMin} ml/min</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
    </Calcolatore>
  )
}

function CalcEGFR({ profile }) {
  const [eta, setEta] = useState('')
  const [sesso, setSesso] = useState('M')
  const [creatinina, setCreatinina] = useState('')

  useEffect(() => {
    if (profile.eta >= 0) setEta(String(profile.eta))
  }, [profile.eta])
  useEffect(() => {
    if (profile.sesso) setSesso(profile.sesso)
  }, [profile.sesso])

  let risultato = null
  let errore = null
  const etaN = numero(eta)
  const creatN = numero(creatinina)
  if (etaN !== null && creatN !== null) {
    try {
      risultato = calcolaEGFRCKDEPI({ eta: etaN, sesso, creatinina: creatN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="eGFR (CKD-EPI 2021)">
      <div className="griglia-campi-ti">
        <Campo etichetta="Età (anni)" valore={eta} onChange={setEta} />
        <CampoSesso etichetta="Sesso" valore={sesso} onChange={setSesso} />
        <Campo etichetta="Creatinina (mg/dL)" valore={creatinina} onChange={setCreatinina} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.egfrMlMin173} ml/min/1.73m²</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">
        Non intercambiabile con la Cockcroft-Gault sopra: CKD-EPI stima la funzione renale
        generale (normalizzata per superficie corporea), Cockcroft-Gault resta il riferimento
        per il dosaggio dei farmaci.
      </p>
    </Calcolatore>
  )
}

// --- Cardio ------------------------------------------------------------------------------

function CalcQTc() {
  const [qtMs, setQtMs] = useState('')
  const [fc, setFc] = useState('')

  let risultato = null
  let errore = null
  const qtN = numero(qtMs)
  const fcN = numero(fc)
  if (qtN !== null && fcN !== null) {
    try {
      risultato = calcolaQTc({ qtMs: qtN, fc: fcN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="QTc (Bazett)">
      <div className="griglia-campi-ti">
        <Campo etichetta="QT (ms)" valore={qtMs} onChange={setQtMs} />
        <Campo etichetta="FC (bpm)" valore={fc} onChange={setFc} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">QTc {risultato.qtcMs} ms</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">Prolungato &gt;450 ms (uomo) / &gt;470 ms (donna).</p>
    </Calcolatore>
  )
}

// --- Altro -------------------------------------------------------------------------------
// "gamma" e "infusione_da_dose_oraria" non ridefiniscono la formula: riusano
// calcolaInfusione e calcolaMlOrariDaConcentrazione da infusionCalculator.js, gia'
// scritte per il Modulo 1 (stessa matematica, evita di duplicarla).

function CalcGamma({ profile }) {
  const [pesoKg, setPesoKg] = useState('')
  const [concentrazioneMcgMl, setConcentrazioneMcgMl] = useState('')
  const [doseMcgKgMin, setDoseMcgKgMin] = useState('')

  useEffect(() => {
    if (profile.pesoKg > 0) setPesoKg(String(profile.pesoKg))
  }, [profile.pesoKg])

  let risultato = null
  let errore = null
  const pesoN = numero(pesoKg)
  const concN = numero(concentrazioneMcgMl)
  const doseN = numero(doseMcgKgMin)
  if (pesoN !== null && concN !== null && doseN !== null) {
    try {
      risultato = calcolaInfusione({ pesoKg: pesoN, concentrazioneMcgMl: concN, doseMcgKgMin: doseN })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="γ ↔ ml/h">
      <div className="griglia-campi-ti">
        <Campo etichetta="Peso (kg)" valore={pesoKg} onChange={setPesoKg} />
        <Campo etichetta="Concentrazione (mcg/ml)" valore={concentrazioneMcgMl} onChange={setConcentrazioneMcgMl} />
        <Campo etichetta="Dose (mcg/kg/min)" valore={doseMcgKgMin} onChange={setDoseMcgKgMin} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.mlH} ml/h</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">
        Stessa formula del calcolatore infusione del Modulo 1 (versione rapida: qui la
        concentrazione si inserisce direttamente).
      </p>
    </Calcolatore>
  )
}

function CalcInfusioneOraria() {
  const [quantitaFarmaco, setQuantitaFarmaco] = useState('')
  const [volumeTotaleMl, setVolumeTotaleMl] = useState('')
  const [doseOraria, setDoseOraria] = useState('')

  const quantita = numero(quantitaFarmaco)
  const volume = numero(volumeTotaleMl)
  const dose = numero(doseOraria)
  const concentrazione = quantita > 0 && volume > 0 ? quantita / volume : null

  let risultato = null
  let errore = null
  if (concentrazione !== null && dose !== null) {
    try {
      risultato = calcolaMlOrariDaConcentrazione({ concentrazioneMgMl: concentrazione, doseMgOra: dose })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="ml/h da dose oraria e diluizione">
      <div className="griglia-campi-ti">
        <Campo etichetta="Quantità farmaco (mg)" valore={quantitaFarmaco} onChange={setQuantitaFarmaco} />
        <Campo etichetta="Volume totale (ml)" valore={volumeTotaleMl} onChange={setVolumeTotaleMl} />
        <Campo etichetta="Dose oraria desiderata (mg/h)" valore={doseOraria} onChange={setDoseOraria} />
      </div>
      {concentrazione > 0 && <p className="nota">Concentrazione: {concentrazione} mg/ml</p>}
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.mlH} ml/h</p>
          <p className="formula">{risultato.formula}</p>
        </>
      )}
      <p className="nota">
        Quantità e dose oraria devono usare la stessa unità di massa (es. mg con mg/h).
      </p>
    </Calcolatore>
  )
}
