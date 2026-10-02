/** "8 mesi", "2 anni 6 mesi", "35 anni". Sotto i 3 anni il dettaglio in mesi serve. */
export function formatEta(eta) {
  if (eta === null || eta === undefined || Number.isNaN(eta)) return null
  if (eta >= 3) return `${Math.floor(eta + 1e-9)} anni`
  const totMesi = Math.round(eta * 12)
  const anni = Math.floor(totMesi / 12)
  const mesi = totMesi % 12
  const parti = []
  if (anni > 0) parti.push(anni === 1 ? '1 anno' : `${anni} anni`)
  if (mesi > 0 || anni === 0) parti.push(`${mesi} ${mesi === 1 ? 'mese' : 'mesi'}`)
  return parti.join(' ')
}

export const LABEL_CATEGORIA = { pediatrico: 'Pediatrico', adulto: 'Adulto', anziano: 'Anziano' }

/** Righe di riepilogo del pannello paziente; null se non c'e' nulla da mostrare. */
export function righeProfilo({ sesso, eta, pesoKg, altezzaCm }, bmi) {
  const riga1 = [sesso, formatEta(eta), pesoKg != null ? `${pesoKg} kg` : null].filter(Boolean)
  const riga2 = [altezzaCm != null ? `${altezzaCm} cm` : null, bmi != null ? `BMI ${bmi}` : null].filter(Boolean)
  if (riga1.length === 0 && riga2.length === 0) return null
  return { riga1: riga1.join(' · '), riga2: riga2.join(' · ') }
}
