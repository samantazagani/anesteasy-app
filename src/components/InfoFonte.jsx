import { useEffect, useRef, useState } from 'react'
import './InfoFonte.css'

// Fonte/pagina/revisione sono dettaglio bibliografico, non un'informazione di sicurezza
// (a differenza di BadgeVerifica, sempre visibile senza interazione): stanno dietro
// un'icona informativa per non affollare la vista del risultato, richiamabili con un
// tocco/click. Se non c'e' una fonte non renderizza nulla (stesso comportamento del
// paragrafo .fonte condizionale che sostituisce).
export function InfoFonte({ fonte, pagina, revisione }) {
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

  if (!fonte) return null

  return (
    <span className="info-fonte" ref={wrapperRef}>
      <button
        type="button"
        className="info-fonte-bottone"
        aria-expanded={aperto}
        aria-label="Mostra fonte"
        onClick={() => setAperto((a) => !a)}
      >
        ⓘ
      </button>
      {aperto && (
        <span className="info-fonte-popover" role="tooltip">
          Fonte: {fonte}
          {pagina ? `, p. ${pagina}` : ''}
          {revisione ? ` · rev. ${revisione}` : ''}
        </span>
      )}
    </span>
  )
}
