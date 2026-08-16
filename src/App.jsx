import { useState } from 'react'
import { ProfiloPaziente } from './pages/ProfiloPaziente.jsx'
import { CalcolatoreDoseBolo } from './pages/CalcolatoreDoseBolo.jsx'
import { CalcolatoreInfusione } from './pages/CalcolatoreInfusione.jsx'
import { CalcolatoreAntibiotici } from './pages/CalcolatoreAntibiotici.jsx'
import { AnestesiaLocale } from './pages/AnestesiaLocale.jsx'
import { Emergenze } from './pages/Emergenze.jsx'
import { Pediatria } from './pages/Pediatria.jsx'
import { Ostetricia } from './pages/Ostetricia.jsx'
import { Nutrizione } from './pages/Nutrizione.jsx'
import { CalcolatoriTI } from './pages/CalcolatoriTI.jsx'
import { Punteggi } from './pages/Punteggi.jsx'
import './App.css'

const VISTE = [
  { id: 'profilo', label: 'Profilo paziente' },
  { id: 'farmaci', label: 'Farmaci' },
  { id: 'infusione', label: 'γ/ml/h' },
  { id: 'antibiotici', label: 'Antibiotici' },
  { id: 'al', label: 'Anestetici locali' },
  { id: 'emergenze', label: 'Emergenze' },
  { id: 'pediatria', label: 'Pediatria' },
  { id: 'ostetricia', label: 'Ostetricia' },
  { id: 'nutrizione', label: 'Nutrizione' },
  { id: 'calcolatori-ti', label: 'Calcolatori TI' },
  { id: 'punteggi', label: 'Punteggi' },
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
      <div hidden={vista !== 'emergenze'}>
        <Emergenze />
      </div>
      <div hidden={vista !== 'pediatria'}>
        <Pediatria />
      </div>
      <div hidden={vista !== 'ostetricia'}>
        <Ostetricia />
      </div>
      <div hidden={vista !== 'nutrizione'}>
        <Nutrizione />
      </div>
      <div hidden={vista !== 'calcolatori-ti'}>
        <CalcolatoriTI />
      </div>
      <div hidden={vista !== 'punteggi'}>
        <Punteggi />
      </div>
    </>
  )
}

export default App
