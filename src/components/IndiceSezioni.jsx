import { useEffect, useRef, useState } from 'react'
import { sezioneAttiva } from '../lib/indiceSezioni'
import './IndiceSezioni.css'

// Un elemento sticky (es. la colonna dei parametri in Ventilazione) resta sempre sotto la linea di
// lettura: non deve contare per capire in quale sezione ci si trova.
function dentroSticky(el, radice) {
  for (let n = el; n && n !== radice; n = n.parentElement) {
    if (getComputedStyle(n).position === 'sticky') return true
  }
  return false
}

// Indice delle sezioni di una pagina lunga: una riga di chip fissa sotto la top bar che salta
// alla sezione e segna quella in cui ci si trova. Le sezioni sono trovate nel DOM (selettore
// `schede`, titolo preso con `titolo`), quindi non serve toccare ogni sezione della pagina.
// Va messo dentro la <section> del modulo, prima delle sezioni.
export function IndiceSezioni({ schede, titolo = 'h2' }) {
  const radice = useRef(null)
  const riga = useRef(null)
  const elementi = useRef([])
  const [voci, setVoci] = useState([])
  const [attiva, setAttiva] = useState(0)

  useEffect(() => {
    const sezione = radice.current?.closest('section')
    if (!sezione) return undefined
    const els = [...sezione.querySelectorAll(schede)]
    elementi.current = els
    els.forEach((el) => el.setAttribute('data-sezione', ''))
    setVoci(els.map((el) => (el.querySelector(titolo)?.textContent ?? '').trim()))

    let rafId = 0
    function aggiorna() {
      rafId = 0
      if (sezione.offsetParent === null) return // modulo nascosto
      const barre = radice.current.getBoundingClientRect().bottom
      const inFondo = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      setAttiva(
        sezioneAttiva(
          els.map((el) => el.getBoundingClientRect().top),
          barre + 24,
          { escludi: els.map((el) => dentroSticky(el, sezione)), inFondo },
        ),
      )
    }
    function suScroll() {
      if (!rafId) rafId = requestAnimationFrame(aggiorna)
    }
    window.addEventListener('scroll', suScroll, { passive: true })
    window.addEventListener('resize', suScroll)
    aggiorna()
    return () => {
      window.removeEventListener('scroll', suScroll)
      window.removeEventListener('resize', suScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [schede, titolo])

  // il chip attivo resta visibile nella riga scorrevole
  useEffect(() => {
    const chip = riga.current?.querySelector('[aria-current="true"]')
    if (!chip) return
    const r = riga.current
    const sinistra = chip.offsetLeft - 16
    const destra = chip.offsetLeft + chip.offsetWidth + 16 - r.clientWidth
    if (sinistra < r.scrollLeft) r.scrollTo({ left: sinistra, behavior: 'smooth' })
    else if (destra > r.scrollLeft) r.scrollTo({ left: destra, behavior: 'smooth' })
  }, [attiva, voci])

  function vai(i) {
    setAttiva(i)
    const riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    elementi.current[i]?.scrollIntoView({ behavior: riduci ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav ref={radice} className="indice-sezioni" aria-label="Sezioni della pagina" hidden={voci.length < 2}>
      <div className="indice-riga" ref={riga}>
        {voci.map((testo, i) => (
          <button
            key={`${i}-${testo}`}
            type="button"
            className={i === attiva ? 'indice-chip attiva' : 'indice-chip'}
            aria-current={i === attiva ? 'true' : undefined}
            onClick={() => vai(i)}
          >
            {testo}
          </button>
        ))}
      </div>
    </nav>
  )
}
