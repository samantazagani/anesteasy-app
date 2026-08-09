// Formule antropometriche per il profilo paziente.
// IBW: formula di Devine. LBW: formula di James (usata anche dai modelli TCI Marsh/Schnider).

export function calcBMI(pesoKg, altezzaCm) {
  if (!(pesoKg > 0) || !(altezzaCm > 0)) return null
  const altezzaM = altezzaCm / 100
  return pesoKg / (altezzaM * altezzaM)
}

export function calcIBW(altezzaCm, sesso) {
  if (!(altezzaCm > 0) || (sesso !== 'M' && sesso !== 'F')) return null
  const pollici = altezzaCm / 2.54
  const oltre152cm = Math.max(0, pollici - 60)
  return sesso === 'F' ? 45.5 + 2.3 * oltre152cm : 50 + 2.3 * oltre152cm
}

export function calcLBW(pesoKg, altezzaCm, sesso) {
  if (!(pesoKg > 0) || !(altezzaCm > 0) || (sesso !== 'M' && sesso !== 'F')) return null
  const rapporto = pesoKg / altezzaCm
  return sesso === 'F'
    ? 1.07 * pesoKg - 148 * rapporto * rapporto
    : 1.1 * pesoKg - 128 * rapporto * rapporto
}

export function round1(valore) {
  return valore === null || valore === undefined ? null : Math.round(valore * 10) / 10
}
