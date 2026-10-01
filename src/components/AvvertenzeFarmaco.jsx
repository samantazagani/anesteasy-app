import { useEffect, useRef, useState } from 'react'
import './AvvertenzeFarmaco.css'

// Stesso pattern di InfoFonte.jsx (icona piccola, popover al tap, si chiude al click
// fuori), ma per farmaco.avvertenze (data/farmaci.json): un triangolo discreto, visibile
// solo se il campo esiste, cosi' l'elenco dosi resta la vista primaria e non invasiva -
// chi vuole le avvertenze le apre, chi no non le vede affatto.
export function AvvertenzeFarmaco({ avvertenze }) {
  const [aperto, setAperto] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!aperto) return undefined

    function chiudiSeFuori(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAperto(false)
      }
    }

    document.addEventListener('mousedown', chiudiSeFuori)
    return () => document.removeEventListener('mousedown', chiudiSeFuori)
  }, [aperto])

  if (!Array.isArray(avvertenze) || avvertenze.length === 0) return null

  return (
    <span className="avvertenze-farmaco" ref={wrapperRef}>
      <button
        type="button"
        className="avvertenze-farmaco-bottone"
        aria-expanded={aperto}
        aria-label="Mostra avvertenze"
        onClick={() => setAperto((a) => !a)}
      >
        ⚠️
      </button>
      {aperto && (
        <ul className="avvertenze-farmaco-popover" role="tooltip">
          {avvertenze.map((voce) => (
            <li key={voce}>{voce}</li>
          ))}
        </ul>
      )}
    </span>
  )
}
