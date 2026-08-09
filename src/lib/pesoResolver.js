// Risolve quale peso del profilo usare per una voce di dose, gestendo sia il caso
// stringa semplice ('reale' | 'IBW' | 'LBW') sia il caso condizionale sul BMI, come
// descritto in farmaci.json > _schema_dose.peso.

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
 * @param {{ pesoKg: number | null, ibw: number | null, lbw: number | null, bmi: number | null }} derivati
 * @returns {{ chiave: string, valoreKg: number | null, condizioneApplicata: string | null }}
 */
export function risolviPeso(pesoSpec, derivati) {
  const mappa = { reale: derivati.pesoKg, IBW: derivati.ibw, LBW: derivati.lbw }

  if (pesoSpec === undefined || pesoSpec === null) {
    return { chiave: 'reale', valoreKg: derivati.pesoKg, condizioneApplicata: null }
  }

  if (typeof pesoSpec === 'string') {
    return { chiave: pesoSpec, valoreKg: mappa[pesoSpec] ?? null, condizioneApplicata: null }
  }

  if (pesoSpec.tipo === 'condizionale') {
    const condizioneVera = valutaCondizione(pesoSpec.eccezione?.condizione, derivati.bmi)
    const chiave = condizioneVera ? pesoSpec.eccezione.usa : pesoSpec.default
    return {
      chiave,
      valoreKg: mappa[chiave] ?? null,
      condizioneApplicata: condizioneVera ? pesoSpec.eccezione.condizione : null,
    }
  }

  return { chiave: 'reale', valoreKg: derivati.pesoKg, condizioneApplicata: null }
}
