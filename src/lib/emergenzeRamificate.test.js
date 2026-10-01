import { describe, expect, it } from 'vitest'
import emergenzeData from '../../data/emergenze.json'
import farmaciData from '../../data/farmaci.json'
import { risolviPassoFarmaco } from './emergenzaStepEngine'
import { calcolaDose } from './doseCalculator'
import { risolviPeso } from './pesoResolver'

// Verifica end-to-end dei 2 algoritmi ramificati (tachiaritmie/bradiaritmie peri-arresto,
// Blocco E): i farmaci citati nei nodi foglia sono richiamati per farmaco_id+contesto in
// "farmaci_rapidi" (NON dalla tabella farmaci_aritmie, mai letta dal codice), con lo stesso
// motore risolviPassoFarmaco/calcolaDose gia' usato per i "passi" lineari del resto del
// modulo. Qui si percorre ogni ramo con un paziente reale (80 kg, adulto) e si verifica che
// ogni riferimento risolva a un farmaco/dose reali, non solo che la struttura "sembri" giusta.

const farmaci = farmaciData.farmaci
const categoria = 'adulto'
const derivati = { pesoKg: 80, categoria }

function tachiaritmie() {
  return emergenzeData.emergenze.find((e) => e.id === 'tachiaritmie-peri-arresto')
}
function bradiaritmie() {
  return emergenzeData.emergenze.find((e) => e.id === 'bradiaritmie-peri-arresto')
}

/** Risolve ogni riferimento farmaci_rapidi di un nodo foglia a un risultato calcolato,
 * cosi' come farebbe <PassoFarmaco>. */
function risolviFarmaciRapidi(nodo) {
  return nodo.farmaci_rapidi.map((ref) => {
    const { farmaco, doseScelta } = risolviPassoFarmaco(ref, farmaci, categoria)
    expect(farmaco).not.toBeNull()
    expect(doseScelta).not.toBeNull()
    const peso = risolviPeso(doseScelta.peso, derivati)
    const risultato = calcolaDose(doseScelta, peso.valoreKg)
    return { nome: farmaco.nome, risultato }
  })
}

/**
 * Cammina un nodo esattamente come fa <NodoAzione> in Emergenze.jsx (stringa | array |
 * oggetto senza "azione" = mappa di sotto-nodi | oggetto con "azione" = foglia + eventuali
 * altre chiavi da ricorrere) e colleziona ogni farmaco_id incontrato in "farmaci_rapidi", a
 * qualunque profondita'. Serve a verificare che la UI non "perda" nodi annidati come
 * instabilita.SE_INSTABILE delle bradiaritmie ({ primo_step, se_risposta_non_soddisfacente },
 * nessuna "azione" al livello piu' alto) o tachiaritmie ({ azione, se_inefficace } - "azione"
 * c'e' ma se_inefficace va comunque visitato): e' esattamente il bug trovato dal vivo nel
 * browser, non dai test a livello di singola foglia scritti sopra (che la navigano gia'
 * pre-risolta, es. emergenza.instabilita.SE_INSTABILE.se_inefficace).
 */
function raccogliFarmacoId(nodo, raccolta = []) {
  if (nodo === undefined || nodo === null || typeof nodo === 'string') return raccolta
  if (Array.isArray(nodo)) {
    for (const n of nodo) raccogliFarmacoId(n, raccolta)
    return raccolta
  }
  if (!('azione' in nodo)) {
    for (const sotto of Object.values(nodo)) raccogliFarmacoId(sotto, raccolta)
    return raccolta
  }
  const { farmaci_rapidi, ...sottoNodi } = nodo
  for (const ref of farmaci_rapidi ?? []) raccolta.push(ref.farmaco_id)
  for (const sotto of Object.values(sottoNodi)) raccogliFarmacoId(sotto, raccolta)
  return raccolta
}

describe('NodoAzione (cammino completo) non perde farmaci annidati sotto rami senza "azione" propria', () => {
  it('tachiaritmie > instabilita.SE_INSTABILE: trova amiodarone e procainamide dentro se_inefficace', () => {
    const trovati = raccogliFarmacoId(tachiaritmie().instabilita.SE_INSTABILE)
    expect(trovati.sort()).toEqual(['amiodarone', 'procainamide'])
  })

  it('bradiaritmie > instabilita.SE_INSTABILE: nessuna "azione" al livello piu\' alto, ma primo_step e se_risposta_non_soddisfacente restano raggiungibili', () => {
    expect('azione' in bradiaritmie().instabilita.SE_INSTABILE).toBe(false)

    const trovati = raccogliFarmacoId(bradiaritmie().instabilita.SE_INSTABILE)
    expect(trovati.sort()).toEqual(['adrenalina', 'atropina', 'atropina', 'isoprenalina'])
  })

  it('tachiaritmie > SE_STABILE (tutto l\'albero QRS x ritmo): tutti i 12 riferimenti sono raggiungibili dalla radice', () => {
    const trovati = raccogliFarmacoId(tachiaritmie().SE_STABILE)
    expect(trovati).toHaveLength(12)
  })

  it('bradiaritmie > SE_STABILE.rischio_asistolia: SE_SI raggiungibile, SE_NO (stringa) non aggiunge nulla', () => {
    const trovati = raccogliFarmacoId(bradiaritmie().SE_STABILE.rischio_asistolia)
    expect(trovati.sort()).toEqual(['adrenalina', 'atropina', 'isoprenalina'])
  })
})

describe('Struttura dei 2 algoritmi ramificati', () => {
  it('entrambi dichiarano tipo "algoritmo_ramificato" e NON hanno un array "passi"', () => {
    for (const e of [tachiaritmie(), bradiaritmie()]) {
      expect(e.tipo).toBe('algoritmo_ramificato')
      expect(e.passi).toBeUndefined()
      expect(Array.isArray(e.valutazione_iniziale)).toBe(true)
      expect(Array.isArray(e.instabilita.segni)).toBe(true)
    }
  })

  it('farmaci_aritmie esiste ancora nel JSON come riferimento, ma nessun farmaco_id in esso viene usato qui', () => {
    expect(emergenzeData.farmaci_aritmie).toBeDefined()
  })
})

describe('Tachiaritmie peri-arresto - ramo INSTABILE', () => {
  it('se_inefficace: amiodarone (mantenimento 900 mg/24h) + procainamide (10-15 mg/kg)', () => {
    const nodo = tachiaritmie().instabilita.SE_INSTABILE.se_inefficace
    const righe = risolviFarmaciRapidi(nodo)

    const amio = righe.find((r) => r.nome === 'Amiodarone')
    expect(amio.risultato.valore).toBe(900)

    const proc = righe.find((r) => r.nome === 'Procainamide')
    expect(proc.risultato.min).toBe(800) // 10 mg/kg * 80
    expect(proc.risultato.max).toBe(1200) // 15 mg/kg * 80
  })
})

describe('Tachiaritmie peri-arresto - ramo STABILE -> QRS largo', () => {
  it('regolare: procainamide + amiodarone (carico e mantenimento)', () => {
    const nodo = tachiaritmie().SE_STABILE['QRS_largo_>=0.12s'].regolare
    const righe = risolviFarmaciRapidi(nodo)
    expect(righe).toHaveLength(3)

    const proc = righe.find((r) => r.nome === 'Procainamide')
    expect(proc.risultato).toMatchObject({ min: 800, max: 1200 }) // 10-15 mg/kg * 80

    const amioEntries = righe.filter((r) => r.nome === 'Amiodarone')
    expect(amioEntries).toHaveLength(2)
    const carico = amioEntries.find((r) => r.risultato.valore === 400) // 5 mg/kg * 80
    const mantenimento = amioEntries.find((r) => r.risultato.valore === 900)
    expect(carico).toBeDefined()
    expect(mantenimento).toBeDefined()
  })

  it('irregolare: 2 scenari distinti (FA pre-eccitata / TV polimorfa), ciascuno coi propri farmaci', () => {
    const nodo = tachiaritmie().SE_STABILE['QRS_largo_>=0.12s'].irregolare
    expect(Array.isArray(nodo)).toBe(true)
    expect(nodo).toHaveLength(2)

    const [faPreeccitata, tvPolimorfa] = nodo
    expect(risolviFarmaciRapidi(faPreeccitata).map((r) => r.nome)).toEqual(['Procainamide'])

    const righeTv = risolviFarmaciRapidi(tvPolimorfa)
    expect(righeTv.map((r) => r.nome).sort()).toEqual(['Isoprenalina', 'Magnesio solfato'])
    // Isoprenalina deve risolvere alla variante a DOSE FISSA (1-20 mcg/min), non a quella
    // su peso (mcg/kg/min): e' il punto che il parametro "unita" di risolviPassoFarmaco risolve.
    const iso = righeTv.find((r) => r.nome === 'Isoprenalina')
    expect(iso.risultato).toMatchObject({ min: 1, max: 20, unita: 'mcg/min' })
  })
})

describe('Tachiaritmie peri-arresto - ramo STABILE -> QRS stretto', () => {
  it('regolare: adenosina (dose fissa) + verapamil + esmololo', () => {
    const nodo = tachiaritmie().SE_STABILE['QRS_stretto_<0.12s'].regolare
    const righe = risolviFarmaciRapidi(nodo)
    expect(righe.map((r) => r.nome).sort()).toEqual(['Adenosina', 'Esmololo', 'Verapamil'])
  })

  it('irregolare: esmololo infusione (non il bolo) + verapamil + diltiazem', () => {
    const nodo = tachiaritmie().SE_STABILE['QRS_stretto_<0.12s'].irregolare
    const righe = risolviFarmaciRapidi(nodo)

    const esmololo = righe.find((r) => r.nome === 'Esmololo')
    expect(esmololo.risultato.unita).toBe('mcg/min') // 50-300 mcg/kg/min * 80 kg -> mcg/min, non il bolo mcg
  })
})

describe('Bradiaritmie peri-arresto - ramo INSTABILE', () => {
  it('primo_step: atropina 0.5 mg (adulto)', () => {
    const nodo = bradiaritmie().instabilita.SE_INSTABILE.primo_step
    const righe = risolviFarmaciRapidi(nodo)
    expect(righe).toEqual([{ nome: 'Atropina', risultato: expect.objectContaining({ valore: 0.5, unita: 'mg' }) }])
  })

  it('se_risposta_non_soddisfacente: atropina + isoprenalina (dose fissa) + adrenalina infusione', () => {
    const nodo = bradiaritmie().instabilita.SE_INSTABILE.se_risposta_non_soddisfacente
    const righe = risolviFarmaciRapidi(nodo)
    expect(righe.map((r) => r.nome).sort()).toEqual(['Adrenalina', 'Atropina', 'Isoprenalina'])

    const iso = righe.find((r) => r.nome === 'Isoprenalina')
    expect(iso.risultato).toMatchObject({ min: 1, max: 20, unita: 'mcg/min' })
  })
})

describe('Bradiaritmie peri-arresto - ramo STABILE -> rischio di asistolia', () => {
  it('SE_SI: stessi farmaci delle misure temporanee', () => {
    const nodo = bradiaritmie().SE_STABILE.rischio_asistolia.SE_SI
    const righe = risolviFarmaciRapidi(nodo)
    expect(righe.map((r) => r.nome).sort()).toEqual(['Adrenalina', 'Atropina', 'Isoprenalina'])
  })

  it('SE_NO: solo testo ("Osservazione"), nessun farmaco_rapidi da risolvere', () => {
    const nodo = bradiaritmie().SE_STABILE.rischio_asistolia.SE_NO
    expect(typeof nodo).toBe('string')
  })
})
