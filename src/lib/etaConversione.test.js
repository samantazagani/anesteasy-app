import { describe, expect, it } from 'vitest'
import { mesiAdAnni, anniAMesi, formatEta, SOGLIA_ETA_MESI_ANNI } from './etaConversione'
import { categoriaEta } from './categoriaEta'
import { selezionaDose } from './selezioneDose'

describe('mesiAdAnni', () => {
  it('8 mesi -> ~0.6667 anni', () => {
    expect(mesiAdAnni(8)).toBeCloseTo(0.6666666666666666, 10)
  })

  it('0 mesi -> 0 anni', () => {
    expect(mesiAdAnni(0)).toBe(0)
  })

  it('36 mesi -> 3 anni esatti', () => {
    expect(mesiAdAnni(36)).toBe(3)
  })

  it('valore negativo o mancante -> null', () => {
    expect(mesiAdAnni(-1)).toBeNull()
    expect(mesiAdAnni(null)).toBeNull()
  })
})

describe('anniAMesi', () => {
  it('0.5 anni -> 6 mesi', () => {
    expect(anniAMesi(0.5)).toBe(6)
  })

  it('e\' l\'inversa di mesiAdAnni (andata e ritorno)', () => {
    const mesiOriginali = 8
    const anni = mesiAdAnni(mesiOriginali)
    expect(Math.round(anniAMesi(anni))).toBe(mesiOriginali)
  })
})

describe('formatEta', () => {
  it('sotto i 3 anni mostra i mesi (es. 8 mesi da un neonato inserito in mesi)', () => {
    expect(formatEta(mesiAdAnni(8))).toBe('8 mesi')
  })

  it('singolare corretto per 1 mese', () => {
    expect(formatEta(mesiAdAnni(1))).toBe('1 mese')
  })

  it('1 anno (< 3) si mostra comunque in mesi: "12 mesi"', () => {
    expect(formatEta(1)).toBe('12 mesi')
  })

  it('neonato a 0 anni esatti -> "0 mesi"', () => {
    expect(formatEta(0)).toBe('0 mesi')
  })

  it('esattamente alla soglia (3 anni) mostra gli anni, non i mesi', () => {
    expect(formatEta(SOGLIA_ETA_MESI_ANNI)).toBe('3 anni')
  })

  it('sopra i 3 anni mostra gli anni, senza decimali superflui', () => {
    expect(formatEta(5)).toBe('5 anni')
    expect(formatEta(45)).toBe('45 anni')
  })

  it('anni con decimali (es. inserito direttamente non in mesi) restano leggibili', () => {
    expect(formatEta(45.5)).toBe('45.5 anni')
  })

  it('eta non nota -> null', () => {
    expect(formatEta(null)).toBeNull()
    expect(formatEta(undefined)).toBeNull()
  })
})

describe('integrazione: categoriaEta e selezionaDose continuano a funzionare con eta frazionaria (mesi convertiti)', () => {
  // Stessa voce reale di data/farmaci.json > adrenalina.dosi (contesto "arresto"), gia'
  // usata altrove nell'app per il dosaggio pediatrico.
  const dosiAdrenalinaArresto = [
    { contesto: 'arresto', fascia_eta: 'adulto', valore: 1, unita: 'mg' },
    { contesto: 'arresto', fascia_eta: 'pediatrico', valore: 0.01, unita: 'mg/kg' },
  ]

  it('un neonato di 8 mesi (eta decimale 0.6667) e\' classificato pediatrico', () => {
    const etaAnni = mesiAdAnni(8)
    expect(categoriaEta(etaAnni)).toBe('pediatrico')
  })

  it('selezionaDose sceglie comunque la voce pediatrica corretta con eta frazionaria', () => {
    const etaAnni = mesiAdAnni(8)
    const categoria = categoriaEta(etaAnni)
    const r = selezionaDose(dosiAdrenalinaArresto, 'arresto', categoria)

    expect(r.fallback).toBe(false)
    expect(r.fasciaUsata).toBe('pediatrico')
    expect(r.candidati[0]).toMatchObject({ valore: 0.01, unita: 'mg/kg' })
  })

  it('un bambino di 40 mesi (3.33 anni, oltre la soglia mesi ma ancora pediatrico) e\' classificato e mostrato correttamente', () => {
    const etaAnni = mesiAdAnni(40) // 3.33 anni
    expect(categoriaEta(etaAnni)).toBe('pediatrico') // categoria clinica: sotto i 18 anni
    expect(formatEta(etaAnni)).toBe('3.33 anni') // soglia di visualizzazione mesi/anni: sotto i 3 anni
  })

  it('35 mesi (appena sotto i 3 anni) e 36 mesi (esattamente 3 anni) restano entrambi pediatrici', () => {
    expect(categoriaEta(mesiAdAnni(35))).toBe('pediatrico')
    expect(categoriaEta(mesiAdAnni(36))).toBe('pediatrico')
  })
})
