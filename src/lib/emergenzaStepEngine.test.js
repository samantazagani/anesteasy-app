import { describe, expect, it } from 'vitest'
import { tipoPasso, isInfusione, risolviPassoFarmaco } from './emergenzaStepEngine'

// Voci reali (semplificate) da data/farmaci.json > adrenalina.dosi
const dosiAdrenalina = [
  { contesto: 'infusione', min: 0.01, max: 0.5, unita: 'mcg/kg/min', peso: 'reale' },
  { contesto: 'arresto', fascia_eta: 'adulto', valore: 1, unita: 'mg' },
  { contesto: 'arresto', fascia_eta: 'pediatrico', valore: 0.01, unita: 'mg/kg', peso: 'reale' },
  { contesto: 'anafilassi', fascia_eta: 'adulto', valore: 0.5, unita: 'mg', via: 'IM' },
  { contesto: 'anafilassi', fascia_eta: 'pediatrico', valore: 0.01, unita: 'mg/kg', via: 'IM' },
]

const farmaci = [{ id: 'adrenalina', nome: 'Adrenalina', dosi: dosiAdrenalina }]

describe('tipoPasso', () => {
  it('azione pura: nessun farmaco_id ne riferimento', () => {
    expect(tipoPasso({ step: 1, azione: 'RCP 30:2, applicare defibrillatore' })).toBe('azione')
  })

  it('farmaco: c\'e\' farmaco_id', () => {
    expect(tipoPasso({ farmaco_id: 'adrenalina', contesto: 'arresto' })).toBe('farmaco')
  })

  it('last: c\'e\' un riferimento esterno (passo LAST di data/emergenze.json)', () => {
    expect(tipoPasso({ riferimento: 'anestetici-locali.json -> last' })).toBe('last')
  })
})

describe('isInfusione', () => {
  it('riconosce le unita di infusione continua (.../min, .../h)', () => {
    expect(isInfusione('mcg/kg/min')).toBe(true)
    expect(isInfusione('mg/kg/h')).toBe(true)
    expect(isInfusione('mg/h')).toBe(true)
  })

  it('non riconosce le unita da bolo singolo', () => {
    expect(isInfusione('mg')).toBe(false)
    expect(isInfusione('mg/kg')).toBe(false)
    expect(isInfusione('mcg')).toBe(false)
  })
})

describe('risolviPassoFarmaco - acls-pediatrico: la fascia_eta del passo prevale sul profilo', () => {
  it('usa la voce pediatrica anche con un profilo caricato (per errore) da adulto', () => {
    // data/emergenze.json > acls-pediatrico, step 2: fascia_eta esplicita "pediatrico".
    const passo = { farmaco_id: 'adrenalina', contesto: 'arresto', fascia_eta: 'pediatrico' }

    const r = risolviPassoFarmaco(passo, farmaci, 'adulto')

    expect(r.fasciaUsata).toBe('pediatrico')
    expect(r.fallback).toBe(false)
    expect(r.doseScelta).toMatchObject({ valore: 0.01, unita: 'mg/kg' })
    expect(r.motore).toBe('bolo')
  })

  it('senza fascia_eta nel passo, ricade sul profilo (comportamento di selezionaDose)', () => {
    const passo = { farmaco_id: 'adrenalina', contesto: 'arresto' }

    const r = risolviPassoFarmaco(passo, farmaci, 'pediatrico')

    expect(r.fasciaUsata).toBe('pediatrico')
    expect(r.doseScelta).toMatchObject({ valore: 0.01, unita: 'mg/kg' })
  })

  it('senza fascia_eta nel passo e profilo non impostato, ricade su adulto', () => {
    const passo = { farmaco_id: 'adrenalina', contesto: 'arresto' }

    const r = risolviPassoFarmaco(passo, farmaci, null)

    expect(r.fasciaUsata).toBe('adulto')
    expect(r.doseScelta).toMatchObject({ valore: 1, unita: 'mg' })
  })
})

describe('risolviPassoFarmaco - anafilassi: stesso farmaco, contesto diverso -> motore diverso', () => {
  it('step 2 "anafilassi" (bolo IM adulto): motore bolo', () => {
    const passo = { farmaco_id: 'adrenalina', contesto: 'anafilassi', fascia_eta: 'adulto' }

    const r = risolviPassoFarmaco(passo, farmaci, 'adulto')

    expect(r.motore).toBe('bolo')
    expect(r.doseScelta).toMatchObject({ valore: 0.5, unita: 'mg' })
  })

  it('step 4 "infusione" (stesso farmaco, refrattaria): motore infusione, non bolo', () => {
    const passo = { farmaco_id: 'adrenalina', contesto: 'infusione' }

    const r = risolviPassoFarmaco(passo, farmaci, 'adulto')

    expect(r.motore).toBe('infusione')
    expect(r.doseScelta).toMatchObject({ min: 0.01, max: 0.5, unita: 'mcg/kg/min' })
  })
})

describe('risolviPassoFarmaco - casi limite', () => {
  it('farmaco_id sconosciuto: nessun farmaco, nessun motore', () => {
    const passo = { farmaco_id: 'non-esiste', contesto: 'x' }

    const r = risolviPassoFarmaco(passo, farmaci, 'adulto')

    expect(r.farmaco).toBeNull()
    expect(r.doseScelta).toBeNull()
    expect(r.motore).toBeNull()
  })

  it('contesto senza dosaggi per quel farmaco: nessun doseScelta, nessun motore', () => {
    const passo = { farmaco_id: 'adrenalina', contesto: 'neonato' }

    const r = risolviPassoFarmaco(passo, farmaci, 'adulto')

    expect(r.doseScelta).toBeNull()
    expect(r.motore).toBeNull()
  })
})
