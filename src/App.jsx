import { useEffect, useRef, useState } from 'react'
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
import { Ventilazione } from './pages/Ventilazione.jsx'
import { Logomark } from './components/Logomark.jsx'
import { Icona } from './components/Icona.jsx'
import { PannelloPaziente } from './components/PannelloPaziente.jsx'
import { NavModuli } from './components/NavModuli.jsx'
import { RicercaModuli } from './components/RicercaModuli.jsx'
import { trovaModulo } from './lib/moduli'
import { useMediaQuery } from './lib/useMediaQuery'
import './App.css'
import './components/Navigazione.css'
import './styles/desktop.css'

function App() {
  const [vista, setVista] = useState('profilo')
  const [menuAperto, setMenuAperto] = useState(false)
  const [ricercaAperta, setRicercaAperta] = useState(false)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const hamburgerRef = useRef(null)
  const chiudiRef = useRef(null)
  const ricercaRef = useRef(null)

  // Sotto i 1024px il menu e' un drawer: sidebar fissa solo su desktop.
  const drawerAperto = menuAperto && !desktop
  const modulo = trovaModulo(vista)

  function vaiA(id) {
    setVista(id)
    setMenuAperto(false)
    setRicercaAperta(false)
    window.scrollTo(0, 0)
  }

  function chiudiMenu() {
    setMenuAperto(false)
    hamburgerRef.current?.focus()
  }

  useEffect(() => {
    if (!drawerAperto) return undefined
    chiudiRef.current?.focus()
    const bloccoPrecedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = bloccoPrecedente
    }
  }, [drawerAperto])

  useEffect(() => {
    if (ricercaAperta) ricercaRef.current?.focus()
  }, [ricercaAperta])

  useEffect(() => {
    function suEsc(e) {
      if (e.key !== 'Escape') return
      if (drawerAperto) chiudiMenu()
      else if (ricercaAperta) setRicercaAperta(false)
    }
    document.addEventListener('keydown', suEsc)
    return () => document.removeEventListener('keydown', suEsc)
  }, [drawerAperto, ricercaAperta])

  return (
    <div className="app-shell">
      {drawerAperto && <div className="drawer-overlay" onClick={chiudiMenu} aria-hidden="true" />}

      <aside
        id="menu-principale"
        className={drawerAperto ? 'sidebar aperta' : 'sidebar'}
        aria-label="Menu principale"
        inert={!desktop && !menuAperto}
      >
        <div className="sidebar-header">
          <Logomark size={30} />
          <span className="sidebar-nome">AnestEasy</span>
          <button
            ref={chiudiRef}
            type="button"
            className="icona-bottone sidebar-chiudi"
            aria-label="Chiudi menu"
            onClick={chiudiMenu}
          >
            <Icona nome="chiudi" size={22} />
          </button>
        </div>
        <PannelloPaziente onModifica={() => vaiA('profilo')} />
        <NavModuli vista={vista} onSeleziona={vaiA} />
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-riga">
            <button
              ref={hamburgerRef}
              type="button"
              className="icona-bottone topbar-hamburger"
              aria-label="Apri menu"
              aria-expanded={drawerAperto}
              aria-controls="menu-principale"
              onClick={() => setMenuAperto(true)}
            >
              <Icona nome="menu" size={22} />
            </button>
            <p className="topbar-titolo">
              <Icona nome={vista} size={20} />
              <span>{modulo.label}</span>
            </p>
            <button
              type="button"
              className="icona-bottone topbar-cerca-toggle"
              aria-label="Cerca modulo"
              aria-expanded={ricercaAperta}
              onClick={() => setRicercaAperta((a) => !a)}
            >
              <Icona nome="cerca" size={22} />
            </button>
          </div>
          <div className={ricercaAperta ? 'topbar-ricerca aperta' : 'topbar-ricerca'}>
            <RicercaModuli onVai={vaiA} inputRef={ricercaRef} />
          </div>
        </header>

        <main className="contenuto">
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
      <div hidden={vista !== 'ventilazione'}>
        <Ventilazione />
      </div>
        </main>
      </div>
    </div>
  )
}

export default App
