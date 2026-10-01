// Risolve quale peso del profilo usare per una voce di dose, gestendo sia il caso
// stringa semplice ('reale' | 'IBW' | 'LBW' | 'ABW') sia il caso condizionale sul BMI, come
// descritto in farmaci.json > _schema_dose.peso e paziente.json > peso_per_modulo.farmaci.
//
// IBW (Devine), LBW (James) e ABW (che e' IBW + una correzione sul reale) sono formule per
// adulti: sotto ~152 cm di altezza (quindi per quasi tutti i pazienti pediatrici) producono
// valori senza senso clinico. Finche' non esiste un criterio pediatrico dedicato, su un
// paziente pediatrico questa funzione ignora sempre IBW/LBW/ABW - sia quando specificati
// come stringa semplice (es. remifentanil, neostigmina) sia quando scelti da una condizione
// sul BMI (che negli adulti usa la soglia >=30, non comunque valida per definire l'obesita'
// pediatrica) - e ricade sul peso reale, invece di applicarli in modo clinicamente sbagliato.
//
// Questo guard riguarda SOLO il peso per il dosaggio farmaci. Il PBW usato per il Vt in
// ventilazione (vedi calcPBW in anthropometrics.js) e' volutamente un percorso del tutto
// separato, che non passa mai da qui: un Vt su peso previsto e' normale a qualunque eta',
// pediatria inclusa, e non va mai azzerato da questo guard.

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
 * @param {{ pesoKg: number | null, ibw: number | null, lbw: number | null, abw?: number | null, bmi: number | null, categoria?: 'pediatrico' | 'adulto' | 'anziano' | null }} derivati
 * @returns {{ chiave: string, valoreKg: number | null, condizioneApplicata: string | null, pesoPediatricoEscluso?: 'IBW' | 'LBW' | 'ABW' }}
 */
export function risolviPeso(pesoSpec, derivati) {
  const mappa = { reale: derivati.pesoKg, IBW: derivati.ibw, LBW: derivati.lbw, ABW: derivati.abw }

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

  if (
    derivati.categoria === 'pediatrico' &&
    (risultato.chiave === 'IBW' || risultato.chiave === 'LBW' || risultato.chiave === 'ABW')
  ) {
    return {
      chiave: 'reale',
      valoreKg: derivati.pesoKg,
      condizioneApplicata: null,
      pesoPediatricoEscluso: risultato.chiave,
    }
  }

  return risultato
}
