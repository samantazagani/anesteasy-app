// Risolve quale peso del profilo usare per una voce di dose, gestendo sia il caso
// stringa semplice ('reale' | 'IBW' | 'LBW') sia il caso condizionale sul BMI, come
// descritto in farmaci.json > _schema_dose.peso.
//
// IBW (Devine) e LBW (James) sono formule per adulti: sotto ~152 cm di altezza (quindi
// per quasi tutti i pazienti pediatrici) producono valori senza senso clinico. Finche'
// non esiste un criterio pediatrico dedicato, su un paziente pediatrico questa funzione
// ignora sempre IBW/LBW - sia quando specificati come stringa semplice (es. remifentanil,
// neostigmina) sia quando scelti da una condizione sul BMI (che negli adulti usa la
// soglia >=30, non comunque valida per definire l'obesita' pediatrica) - e ricade sul
// peso reale, invece di applicarli in modo clinicamente sbagliato.

function valutaCondizione(condizione, bmi) {
  const match = /^\s*BMI\s*(>=|<=|>|<|==)\s*(\d+(?:\.\d+)?)\s*$/.exec(condizione ?? '')
  if (!match || bmi === null || bmi === undefined) return false
  const [, operatore, sogliaTesto] = match
  const soglia = Number(sogliaTesto)
  switch (operatore) {
    case '>=':
      return bmi >= soglia
    case '<=':
      return bmi <= soglia
    case '>':
      return bmi > soglia
    case '<':
      return bmi < soglia
    case '==':
      return bmi === soglia
    default:
      return false
  }
}

/**
 * @param {string | { tipo: string, default: string, eccezione: { condizione: string, usa: string } } | undefined} pesoSpec
 * @param {{ pesoKg: number | null, ibw: number | null, lbw: number | null, bmi: number | null, categoria?: 'pediatrico' | 'adulto' | 'anziano' | null }} derivati
 * @returns {{ chiave: string, valoreKg: number | null, condizioneApplicata: string | null, pesoPediatricoEscluso?: 'IBW' | 'LBW' }}
 */
export function risolviPeso(pesoSpec, derivati) {
  const mappa = { reale: derivati.pesoKg, IBW: derivati.ibw, LBW: derivati.lbw }

  let risultato
  if (pesoSpec === undefined || pesoSpec === null) {
    risultato = { chiave: 'reale', valoreKg: derivati.pesoKg, condizioneApplicata: null }
  } else if (typeof pesoSpec === 'string') {
    risultato = { chiave: pesoSpec, valoreKg: mappa[pesoSpec] ?? null, condizioneApplicata: null }
  } else if (pesoSpec.tipo === 'condizionale') {
    const condizioneVera = valutaCondizione(pesoSpec.eccezione?.condizione, derivati.bmi)
    const chiave = condizioneVera ? pesoSpec.eccezione.usa : pesoSpec.default
    risultato = {
      chiave,
      valoreKg: mappa[chiave] ?? null,
      condizioneApplicata: condizioneVera ? pesoSpec.eccezione.condizione : null,
    }
  } else {
    risultato = { chiave: 'reale', valoreKg: derivati.pesoKg, condizioneApplicata: null }
  }

  if (derivati.categoria === 'pediatrico' && (risultato.chiave === 'IBW' || risultato.chiave === 'LBW')) {
    return {
      chiave: 'reale',
      valoreKg: derivati.pesoKg,
      condizioneApplicata: null,
      pesoPediatricoEscluso: risultato.chiave,
    }
  }

  return risultato
}
