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
  calcolaCorrezioneSodioAdrogue,
  calcolaPIAConversione,
} from '../lib/calcolatoriTI'
import '../styles/risultato.css'
import './CalcolatoriTI.css'

// Stesso raggruppamento per "categoria" di data/calcolatori-ti.json (19 calcolatori):
// elettroliti ordinati per il campo "ordine" del JSON (flusso di un caso clinico), CPP
// spostato da Emodinamica a Neuro, "equilibrio acido-base" come categoria propria
// (anion gap + Winter, prima divisi tra Elettroliti e Respiratorio).
const CATEGORIE = [
  { id: 'elettroliti', label: 'Elettroliti' },
  { id: 'equilibrio-acido-base', label: 'Equilibrio acido-base' },
  { id: 'respiratorio', label: 'Respiratorio' },
  { id: 'emodinamica', label: 'Emodinamica' },
  { id: 'neuro', label: 'Neuro' },
  { id: 'addome', label: 'Addome' },
  { id: 'renale', label: 'Renale' },
  { id: 'cardiologia', label: 'Cardiologia' },
  { id: 'infusioni', label: 'Infusioni' },
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
      </div>
      {children}
    </div>
  )
}

export function CalcolatoriTI() {
  const { profile } = usePatientProfile()
  const [categoria, setCategoria] = useState('elettroliti')

  return (
    <section id="calcolatori-ti">
      <h1>Calcolatori TI</h1>
      <p className="sottotitolo">
        19 calcolatori indipendenti (data/calcolatori-ti.json): valori di laboratorio da
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

      {/* Ordine come da data/calcolatori-ti.json > _ordine_elettroliti: segue il flusso di
          un caso clinico (Na corretto -> gap osmolare -> deficit sodio -> Adrogue-Madias
          -> deficit idrico -> potassio -> calcio). */}
      <div hidden={categoria !== 'elettroliti'}>
        <CalcSodioCorretto />
        <CalcGapOsmolare />
        <CalcDeficitSodio profile={profile} />
        <CalcCorrezioneSodioAdrogue profile={profile} />
        <CalcDeficitIdrico profile={profile} />
        <CalcDeficitPotassio />
        <CalcCalcioCorretto />
      </div>

      <div hidden={categoria !== 'equilibrio-acido-base'}>
        <CalcAnionGap />
        <CalcWinter />
      </div>

      <div hidden={categoria !== 'respiratorio'}>
        <CalcAaGradient />
      </div>

      <div hidden={categoria !== 'emodinamica'}>
        <CalcMAP />
        <CalcShockIndex />
      </div>

      <div hidden={categoria !== 'neuro'}>
        <CalcCPP />
      </div>

      <div hidden={categoria !== 'addome'}>
        <CalcPIAConversione />
      </div>

      <div hidden={categoria !== 'renale'}>
        <CalcClearanceCreatinina profile={profile} />
        <CalcEGFR profile={profile} />
      </div>

      <div hidden={categoria !== 'cardiologia'}>
        <CalcQTc />
      </div>

      <div hidden={categoria !== 'infusioni'}>
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

const LABEL_SOLUZIONE_ADROGUE = {
  'ipertonica_3%': 'Ipertonica 3% (Na 513 mEq/L)',
  'fisiologica_0.9%': 'Fisiologica 0.9% (Na 154 mEq/L)',
}

function CalcCorrezioneSodioAdrogue({ profile }) {
  const [pesoKg, setPesoKg] = useState('')
  const [sesso, setSesso] = useState('M')
  const [eta, setEta] = useState('')
  const [naPaziente, setNaPaziente] = useState('')
  const [soluzione, setSoluzione] = useState('ipertonica_3%')
  const [targetDeltaNa24h, setTargetDeltaNa24h] = useState('6')

  useEffect(() => {
    if (profile.pesoKg > 0) setPesoKg(String(profile.pesoKg))
  }, [profile.pesoKg])
  useEffect(() => {
    if (profile.sesso) setSesso(profile.sesso)
  }, [profile.sesso])
  useEffect(() => {
    if (profile.eta >= 0) setEta(String(profile.eta))
  }, [profile.eta])

  let risultato = null
  let errore = null
  const peso = numero(pesoKg)
  const etaN = numero(eta)
  const na = numero(naPaziente)
  const target = numero(targetDeltaNa24h)
  if (peso !== null && etaN !== null && na !== null && target !== null) {
    try {
      risultato = calcolaCorrezioneSodioAdrogue({
        naPaziente: na,
        pesoKg: peso,
        sesso,
        eta: etaN,
        soluzione,
        targetDeltaNa24h: target,
      })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="Correzione Na sicura (Adrogue-Madias)">
      {/* Limiti e protocollo di sicurezza sempre visibili, non solo una nota in fondo: vanno
          letti prima del risultato, non dopo. */}
      <div className="avviso avviso-sicurezza">
        <p>
          <strong>Limiti di correzione in 24h:</strong> 6-8 mEq/L (≤6 se alto rischio: Na&lt;115,
          etilismo, malnutrizione, ipokaliemia, epatopatia avanzata). Limite in 48h: &lt;18 mEq/L.
        </p>
        <p>
          La formula <strong>sottostima</strong> il rialzo reale (ignora diuresi/perdite di acqua
          libera): è solo una stima iniziale — ricontrollare il Na ogni 2-4h.
        </p>
        <p>
          <strong>Sintomi neurologici gravi</strong> (convulsioni, coma): boli di ipertonica 3%
          100-150 ml in 10-20 min, ripetibili fino a un rialzo di 4-6 mEq/L, poi STOP (il tetto
          delle 24h vale comunque).
        </p>
        <p>Se overcorrezione: ri-abbassare con glucosata 5% ± desmopressina (DDAVP).</p>
      </div>

      <div className="griglia-campi-ti">
        <Campo etichetta="Na paziente (mmol/L)" valore={naPaziente} onChange={setNaPaziente} />
        <Campo etichetta="Peso (kg)" valore={pesoKg} onChange={setPesoKg} />
        <CampoSesso etichetta="Sesso" valore={sesso} onChange={setSesso} />
        <Campo etichetta="Età (anni)" valore={eta} onChange={setEta} />
        <label className="campo-numerico">
          Soluzione
          <select value={soluzione} onChange={(e) => setSoluzione(e.target.value)}>
            {Object.entries(LABEL_SOLUZIONE_ADROGUE).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </label>
        <Campo etichetta="Target ΔNa 24h (mEq/L)" valore={targetDeltaNa24h} onChange={setTargetDeltaNa24h} />
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">{risultato.velocitaMlH} ml/h</p>
          <p className="formula">{risultato.formula}</p>
          <p className="nota">
            ACT calcolata con coefficiente {risultato.coeff} ({risultato.coeffChiave.replaceAll('_', ' ')}) ={' '}
            {risultato.actL} L. Volume stimato: {risultato.volumeMl24h} ml/24h.
          </p>
          {risultato.superaLimiteAssoluto && (
            <p className="avviso avviso-errore">
              Target sopra il tetto assoluto di 8 mEq/L/24h: rivedere il target prima di impostare
              l'infusione.
            </p>
          )}
          {!risultato.superaLimiteAssoluto && risultato.superaLimiteAltoRischio && (
            <p className="avviso avviso-sicurezza">
              Target sopra 6 mEq/L/24h: accettabile solo se il paziente NON ha fattori di alto
              rischio (Na&lt;115, etilismo, malnutrizione, ipoK, epatopatia).
            </p>
          )}
        </>
      )}
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

function CalcMAP() {
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

function CalcCPP() {
  const [map, setMap] = useState('')
  const [icp, setIcp] = useState('')

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
      <p className="nota">Target tipico 60-70 mmHg. MAP misurata a livello del trago.</p>
    </Calcolatore>
  )
}

// --- Addome ------------------------------------------------------------------------------

const LABEL_LIVELLO_PIA = {
  normale: 'Normale (5-7 mmHg)',
  elevato: 'Sopra il range normale (non ancora IAH)',
  ipertensione_intra_addominale: 'Ipertensione intra-addominale (>12 mmHg)',
  sindrome_compartimentale: 'Sindrome compartimentale addominale (>20 mmHg)',
}

function CalcPIAConversione() {
  const [valore, setValore] = useState('')
  const [unitaDiPartenza, setUnitaDiPartenza] = useState('cmH2O')

  let risultato = null
  let errore = null
  const valoreN = numero(valore)
  if (valoreN !== null) {
    try {
      risultato = calcolaPIAConversione({ valore: valoreN, unitaDiPartenza })
    } catch (e) {
      errore = e.message
    }
  }

  return (
    <Calcolatore titolo="PIA: conversione cmH2O ↔ mmHg">
      <div className="griglia-campi-ti">
        <Campo etichetta="Valore" valore={valore} onChange={setValore} />
        <label className="campo-numerico">
          Unità di partenza
          <select value={unitaDiPartenza} onChange={(e) => setUnitaDiPartenza(e.target.value)}>
            <option value="cmH2O">cmH2O</option>
            <option value="mmHg">mmHg</option>
          </select>
        </label>
      </div>
      {errore && <p className="avviso avviso-errore">{errore}</p>}
      {risultato && (
        <>
          <p className="risultato-primario">
            {risultato.convertito} {risultato.unitaConvertita}
          </p>
          <p className="formula">{risultato.formula}</p>
          <p className="avviso avviso-sicurezza">{LABEL_LIVELLO_PIA[risultato.livello]}</p>
        </>
      )}
      <p className="nota">
        PIA (pressione intra-addominale) misurata in vescica. Normale 5-7 mmHg; ipertensione
        intra-addominale &gt;12 mmHg; sindrome compartimentale addominale &gt;20 mmHg.
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
