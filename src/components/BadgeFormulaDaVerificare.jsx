import './BadgeFormulaDaVerificare.css'

// Distinto da BadgeVerifica: qui non e' solo il dato clinico a non essere confermato, e'
// il JSON stesso a segnalare incertezza matematica sul coefficiente della formula (es.
// mechanical_power in data/ventilazione.json). Va marcato in modo piu' forte del bozza
// standard, perche' il rischio non e' "verificare la soglia" ma "il calcolo potrebbe
// essere sbagliato".
export function BadgeFormulaDaVerificare({ children }) {
  return (
    <span className="badge-formula-incerta" role="status">
      ⚠ FORMULA DA VERIFICARE{children ? ` · ${children}` : ''}
    </span>
  )
}
