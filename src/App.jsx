import { useState } from 'react'
import { ProfiloPaziente } from './pages/ProfiloPaziente.jsx'
import { CalcolatoreDoseBolo } from './pages/CalcolatoreDoseBolo.jsx'
import { CalcolatoreInfusione } from './pages/CalcolatoreInfusione.jsx'
import { CalcolatoreAntibiotici } from './pages/CalcolatoreAntibiotici.jsx'
import { AnestesiaLocale } from './pages/AnestesiaLocale.jsx'
import './App.css'

const VISTE = [
  { id: 'profilo', label: 'Profilo paziente' },
  { id: 'farmaci', label: 'Farmaci' },
  { id: 'infusione', label: 'γ/ml/h' },
  { id: 'antibiotici', label: 'Antibiotici' },
  { id: 'al', label: 'Anestetici locali' },
]

function App() {
  const [vista, setVista] = useState('profilo')

  return (
    <>
      <nav id="tab-nav" aria-label="Sezioni">
        {VISTE.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-selected={v.id === vista}
            className={v.id === vista ? 'tab-item selezionato' : 'tab-item'}
            onClick={() => setVista(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {/* Nascosti (non smontati) col cambio tab: cosi' la selezione farmaco/contesto
          nel calcolatore non si perde tornando dal profilo paziente. */}
      <div hidden={vista !== 'profilo'}>
        <ProfiloPaziente />
      </div>
      <div hidden={vista !== 'farmaci'}>
        <CalcolatoreDoseBolo />
      </div>
      <div hidden={vista !== 'infusione'}>
        <CalcolatoreInfusione />
      </div>
      <div hidden={vista !== 'antibiotici'}>
        <CalcolatoreAntibiotici />
      </div>
      <div hidden={vista !== 'al'}>
        <AnestesiaLocale />
      </div>
    </>
  )
}

export default App
