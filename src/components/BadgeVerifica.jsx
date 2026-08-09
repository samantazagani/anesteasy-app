import './BadgeVerifica.css'

// Riutilizzabile in tutti i moduli: ogni valore clinico non ancora controllato dal
// medico (verificato: false in data/*.json) deve mostrare questo avviso, per il
// principio "ogni valore ha una fonte citata" di PROGETTO.md.
export function BadgeVerifica({ verificato }) {
  if (verificato) return null
  return (
    <span className="badge-bozza" role="status">
      BOZZA · non verificato
    </span>
  )
}
