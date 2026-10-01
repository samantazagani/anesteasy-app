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

/**
 * PBW (peso corporeo previsto, per il Vt in ventilazione): data/paziente.json lo dichiara
 * esplicitamente "= IBW (Devine)" — stessa formula di calcIBW, quindi NUMERICAMENTE
 * identico nell'adulto. E' pero' una funzione a se' stante, non un semplice alias d'uso,
 * perche' le due cose sono CONCETTUALMENTE separate e vanno tenute cosi':
 *
 * - calcIBW alimenta risolviPeso (pesoResolver.js) per i FARMACI, dove un guard di
 *   sicurezza esclude SEMPRE IBW/LBW/ABW nel paziente pediatrico (la formula di Devine non
 *   ha senso sotto ~152cm) e ricade sul peso reale.
 * - calcPBW alimenta invece il Vt in ventilazione, dove un volume corrente calcolato sul
 *   peso previsto e' normale e ATTESO a QUALUNQUE eta' (anche nel neonato/bambino): non deve
 *   MAI ereditare quel guard pediatrico, o un bambino piccolo si ritroverebbe senza alcun
 *   Vt/kg PBW calcolabile.
 *
 * Chi chiama questa funzione per il profilo condiviso (PatientProfileContext) ottiene quindi
 * un valore sempre calcolato (mai azzerato per eta'), indipendente dal path farmaci/IBW.
 * Nota: il modulo Ventilazione (ventilazioneCalculator.js > calcolaPBW) usa una propria
 * implementazione isolata con lo stesso principio ma un coefficiente arrotondato (0.91 invece
 * di 2.3/2.54): scelta gia' presente prima di questo cambiamento, lasciata invariata per non
 * toccare un calcolatore gia' testato — la differenza numerica e' <0.2 kg anche alle altezze
 * estreme.
 */
export function calcPBW(altezzaCm, sesso) {
  return calcIBW(altezzaCm, sesso)
}

/**
 * ABW (adjusted/corrected body weight): IBW + 0.4×(peso reale - IBW). Richiede l'IBW gia'
 * calcolato (stesso principio di calcPBW sopra: niente ricalcolo nascosto, cosi' chi lo
 * chiama vede chiaramente da dove viene il numero). Come IBW, e' una formula per adulti:
 * chi la usa per un paziente pediatrico (es. nutrizione) applica il proprio guard a monte,
 * qui non c'e' alcuna eccezione impostata di default.
 */
export function calcABW(pesoKg, ibw) {
  if (!(pesoKg > 0) || !(ibw > 0)) return null
  return ibw + 0.4 * (pesoKg - ibw)
}

export function round1(valore) {
  return valore === null || valore === undefined ? null : Math.round(valore * 10) / 10
}
