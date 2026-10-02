import { GRUPPI_MODULI } from '../lib/moduli'
import { Icona } from './Icona.jsx'
import './Navigazione.css'

export function NavModuli({ vista, onSeleziona }) {
  return (
    <nav className="nav-moduli" aria-label="Moduli">
      {GRUPPI_MODULI.map((gruppo, i) => (
        <div className="nav-gruppo" key={gruppo.etichetta ?? i}>
          {gruppo.etichetta && <p className="nav-gruppo-etichetta">{gruppo.etichetta}</p>}
          <ul>
            {gruppo.moduli.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={m.id === vista ? 'nav-voce attiva' : 'nav-voce'}
                  aria-current={m.id === vista ? 'page' : undefined}
                  onClick={() => onSeleziona(m.id)}
                >
                  <Icona nome={m.id} size={20} />
                  <span>{m.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
