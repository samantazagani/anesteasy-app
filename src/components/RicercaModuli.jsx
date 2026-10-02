import { useState } from 'react'
import { cercaModuli } from '../lib/moduli'
import { Icona } from './Icona.jsx'
import './Navigazione.css'

// Ricerca rapida: salta al modulo per nome (o parola chiave). Non cerca dentro ai contenuti.
export function RicercaModuli({ onVai, inputRef }) {
  const [testo, setTesto] = useState('')
  const risultati = cercaModuli(testo)

  function vai(id) {
    setTesto('')
    onVai(id)
  }

  return (
    <div className="ricerca-moduli" role="search">
      <label className="ricerca-moduli-campo">
        <Icona nome="cerca" size={18} />
        <input
          ref={inputRef}
          type="search"
          placeholder="Cerca modulo…"
          aria-label="Cerca modulo"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && risultati.length > 0) vai(risultati[0].id)
            if (e.key === 'Escape') setTesto('')
          }}
        />
      </label>
      {testo.trim() !== '' && (
        <ul className="ricerca-moduli-risultati">
          {risultati.map((m) => (
            <li key={m.id}>
              <button type="button" className="nav-voce" onClick={() => vai(m.id)}>
                <Icona nome={m.id} size={18} />
                <span>{m.label}</span>
              </button>
            </li>
          ))}
          {risultati.length === 0 && <li className="ricerca-moduli-vuoto">Nessun modulo trovato.</li>}
        </ul>
      )}
    </div>
  )
}
