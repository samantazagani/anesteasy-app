import { describe, expect, it } from 'vitest'
import { calcolaEtaDecimale, anniAMesi, formatEta, SOGLIA_ETA_MESI_ANNI } from './etaConversione'
import { categoriaEta } from './categoriaEta'
import { selezionaDose } from './selezioneDose'

describe('calcolaEtaDecimale', () => {
  it('2 anni + 3 mesi -> 2.25 anni', () => {
    expect(calcolaEtaDecimale(2, 3)).toBeCloseTo(2.25, 10)
  })

  it('0 anni + 8 mesi -> ~0.6667 anni (solo mesi)', () => {
    expect(calcolaEtaDecimale(0, 8)).toBeCloseTo(0.6666666666666666, 10)
  })

  it('anni senza mesi -> il valore in anni esatto', () => {
    expect(calcolaEtaDecimale(5, 0)).toBe(5)
  })

  it('mesi mancante (null/undefined) conta come 0', () => {
    expect(calcolaEtaDecimale(5, null)).toBe(5)
    expect(calcolaEtaDecimale(5, undefined)).toBe(5)
  })

  it('anni mancante (null/undefined) conta come 0', () => {
    expect(calcolaEtaDecimale(null, 6)).toBe(0.5)
    expect(calcolaEtaDecimale(undefined, 6)).toBe(0.5)
  })

  it('entrambi mancanti -> 0 (la scelta di trattare "nessun input" come eta non impostata spetta al chiamante)', () => {
    expect(calcolaEtaDecimale(null, null)).toBe(0)
  })

  it('36 mesi (senza anni) -> 3 anni esatti', () => {
    expect(calcolaEtaDecimale(0, 36)).toBe(3)
  })

  it('valori negativi -> null', () => {
    expect(calcolaEtaDecimale(-1, 0)).toBeNull()
    expect(calcolaEtaDecimale(0, -1)).toBeNull()
  })
})

describe('anniAMesi', () => {
  it('0.5 anni -> 6 mesi', () => {
    expect(anniAMesi(0.5)).toBe(6)
  })
})

describe('formatEta', () => {
  it('caso combinato: 2 anni e 3 mesi', () => {
    expect(formatEta(calcolaEtaDecimale(2, 3))).toBe('2 anni e 3 mesi')
  })

  it('caso combinato con anno singolare: 1 anno e 3 mesi', () => {
    expect(formatEta(calcolaEtaDecimale(1, 3))).toBe('1 anno e 3 mesi')
  })

  it('solo mesi (anni a 0): "8 mesi"', () => {
    expect(formatEta(calcolaEtaDecimale(0, 8))).toBe('8 mesi')
  })

  it('singolare corretto per 1 mese', () => {
    expect(formatEta(calcolaEtaDecimale(0, 1))).toBe('1 mese')
  })

  it('solo anni, senza resto in mesi: "1 anno" (non piu\' "12 mesi")', () => {
    expect(formatEta(calcolaEtaDecimale(1, 0))).toBe('1 anno')
  })

  it('2 anni esatti, nessun resto: "2 anni"', () => {
    expect(formatEta(calcolaEtaDecimale(2, 0))).toBe('2 anni')
  })

  it('neonato a 0 anni e 0 mesi esatti -> "0 mesi"', () => {
    expect(formatEta(0)).toBe('0 mesi')
  })

  it('esattamente alla soglia (3 anni) mostra gli anni, non i mesi', () => {
    expect(formatEta(SOGLIA_ETA_MESI_ANNI)).toBe('3 anni')
  })

  it('sopra i 3 anni mostra solo gli anni, senza decimali superflui', () => {
    expect(formatEta(5)).toBe('5 anni')
    expect(formatEta(45)).toBe('45 anni')
  })

  it('anni con decimali (es. inserito direttamente, sopra soglia) restano leggibili', () => {
    expect(formatEta(45.5)).toBe('45.5 anni')
  })

  it('eta non nota -> null', () => {
    expect(formatEta(null)).toBeNull()
    expect(formatEta(undefined)).toBeNull()
  })
})

describe('integrazione: categoriaEta e selezionaDose continuano a funzionare con eta combinata (anni+mesi)', () => {
  // Stessa voce reale di data/farmaci.json > adrenalina.dosi (contesto "arresto"), gia'
  // usata altrove nell'app per il dosaggio pediatrico.
  const dosiAdrenalinaArresto = [
    { contesto: 'arresto', fascia_eta: 'adulto', valore: 1, unita: 'mg' },
    { contesto: 'arresto', fascia_eta: 'pediatrico', valore: 0.01, unita: 'mg/kg' },
  ]

  it('un neonato di 0 anni e 8 mesi (eta decimale 0.6667) e\' classificato pediatrico', () => {
    const etaAnni = calcolaEtaDecimale(0, 8)
    expect(categoriaEta(etaAnni)).toBe('pediatrico')
  })

  it('selezionaDose sceglie comunque la voce pediatrica corretta con eta combinata', () => {
    const etaAnni = calcolaEtaDecimale(0, 8)
    const categoria = categoriaEta(etaAnni)
    const r = selezionaDose(dosiAdrenalinaArresto, 'arresto', categoria)

    expect(r.fallback).toBe(false)
    expect(r.fasciaUsata).toBe('pediatrico')
    expect(r.candidati[0]).toMatchObject({ valore: 0.01, unita: 'mg/kg' })
  })

  it('un bambino di 3 anni e 4 mesi (3.33 anni, oltre la soglia mesi ma ancora pediatrico) e\' classificato e mostrato correttamente', () => {
    const etaAnni = calcolaEtaDecimale(3, 4) // 3.33 anni
    expect(categoriaEta(etaAnni)).toBe('pediatrico') // categoria clinica: sotto i 18 anni
    expect(formatEta(etaAnni)).toBe('3.33 anni') // soglia di visualizzazione mesi/anni: sotto i 3 anni
  })

  it('2 anni e 11 mesi (appena sotto i 3 anni) e 3 anni esatti restano entrambi pediatrici', () => {
    expect(categoriaEta(calcolaEtaDecimale(2, 11))).toBe('pediatrico')
    expect(categoriaEta(calcolaEtaDecimale(3, 0))).toBe('pediatrico')
  })
})
