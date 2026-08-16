import { describe, expect, it } from 'vitest'
import {
  calcolaStopBang,
  calcolaRCRI,
  calcolaApfel,
  calcolaGCS,
  calcolaCamIcu,
  calcolaROX,
  calcolaAldrete,
  calcolaFour,
} from './punteggiCalculator'

describe('calcolaStopBang', () => {
  it('0 voci selezionate -> basso rischio', () => {
    const r = calcolaStopBang([false, false, false, false, false, false, false, false])
    expect(r.punteggio).toBe(0)
    expect(r.rischio).toBe('basso')
  })

  it('4 voci selezionate -> rischio intermedio', () => {
    const selezionati = [true, true, true, true, false, false, false, false]
    const r = calcolaStopBang(selezionati)
    expect(r.punteggio).toBe(4)
    expect(r.rischio).toBe('intermedio')
  })

  it('7 voci selezionate -> rischio alto', () => {
    const selezionati = [true, true, true, true, true, true, true, false]
    const r = calcolaStopBang(selezionati)
    expect(r.punteggio).toBe(7)
    expect(r.rischio).toBe('alto')
  })

  it('lancia un errore se il numero di voci non e\' 8', () => {
    expect(() => calcolaStopBang([true, false])).toThrow(/8 voci/)
  })
})

describe('calcolaRCRI - caso reale: 2 fattori presenti -> 6.6%', () => {
  it('2 fattori su 6 -> punteggio 2, interpretazione 6.6%', () => {
    // chirurgia ad alto rischio + cardiopatia ischemica presenti, resto assente.
    const selezionati = [true, true, false, false, false, false]
    const r = calcolaRCRI(selezionati)

    expect(r.punteggio).toBe(2)
    expect(r.percentuale).toBe('6.6%')
    expect(r.interpretazione).toBe('6.6% di rischio di eventi cardiaci maggiori')
  })

  it('0 fattori -> 0.4%', () => {
    expect(calcolaRCRI([false, false, false, false, false, false]).percentuale).toBe('0.4%')
  })

  it('1 fattore -> 0.9%', () => {
    expect(calcolaRCRI([true, false, false, false, false, false]).percentuale).toBe('0.9%')
  })

  it('3 o piu\' fattori -> 11%', () => {
    expect(calcolaRCRI([true, true, true, false, false, false]).percentuale).toBe('11%')
    expect(calcolaRCRI([true, true, true, true, true, true]).percentuale).toBe('11%')
  })
})

describe('calcolaApfel', () => {
  it('mappa 0-4 fattori a 10/20/40/60/80%', () => {
    expect(calcolaApfel([false, false, false, false]).percentuale).toBe(10)
    expect(calcolaApfel([true, false, false, false]).percentuale).toBe(20)
    expect(calcolaApfel([true, true, false, false]).percentuale).toBe(40)
    expect(calcolaApfel([true, true, true, false]).percentuale).toBe(60)
    expect(calcolaApfel([true, true, true, true]).percentuale).toBe(80)
  })
})

describe('calcolaGCS', () => {
  it('punteggio massimo: 4+5+6=15, non in coma', () => {
    const r = calcolaGCS({ aperturaOcchi: 4, rispostaVerbale: 5, rispostaMotoria: 6 })
    expect(r.punteggio).toBe(15)
    expect(r.coma).toBe(false)
  })

  it('punteggio minimo: 1+1+1=3, coma', () => {
    const r = calcolaGCS({ aperturaOcchi: 1, rispostaVerbale: 1, rispostaMotoria: 1 })
    expect(r.punteggio).toBe(3)
    expect(r.coma).toBe(true)
  })

  it('soglia coma: punteggio 8 vs 9', () => {
    expect(calcolaGCS({ aperturaOcchi: 2, rispostaVerbale: 2, rispostaMotoria: 4 }).coma).toBe(true) // 8
    expect(calcolaGCS({ aperturaOcchi: 2, rispostaVerbale: 3, rispostaMotoria: 4 }).coma).toBe(false) // 9
  })

  it('lancia un errore se un componente e\' fuori range', () => {
    expect(() => calcolaGCS({ aperturaOcchi: 5, rispostaVerbale: 5, rispostaMotoria: 6 })).toThrow(/apertura/i)
  })
})

describe('calcolaCamIcu - tutte le combinazioni booleane (positivo solo 1+2+almeno uno tra 3/4)', () => {
  const casi = [
    // [c1, c2, c3, c4, atteso]
    [false, false, false, false, false],
    [true, false, false, false, false],
    [false, true, false, false, false],
    [false, false, true, false, false],
    [false, false, false, true, false],
    [true, true, false, false, false], // 1+2 ma ne' 3 ne' 4 -> negativo
    [true, false, true, false, false], // manca il 2 -> negativo
    [false, true, true, false, false], // manca l'1 -> negativo
    [true, true, true, false, true], // 1+2+3 -> positivo
    [true, true, false, true, true], // 1+2+4 -> positivo
    [true, true, true, true, true], // tutti -> positivo
    [true, false, true, true, false], // manca il 2 anche con 3 e 4 -> negativo
    [false, true, true, true, false], // manca l'1 anche con 3 e 4 -> negativo
    [true, true, false, false, false], // duplicato di controllo: 1+2 soli -> negativo
  ]

  it.each(casi)('c1=%s c2=%s c3=%s c4=%s -> positivo=%s', (criterio1, criterio2, criterio3, criterio4, atteso) => {
    const r = calcolaCamIcu({ criterio1, criterio2, criterio3, criterio4 })
    expect(r.positivo).toBe(atteso)
  })

  it('verifica esaustiva su tutte le 16 combinazioni contro la definizione c1 && c2 && (c3 || c4)', () => {
    for (let mask = 0; mask < 16; mask++) {
      const criterio1 = Boolean(mask & 1)
      const criterio2 = Boolean(mask & 2)
      const criterio3 = Boolean(mask & 4)
      const criterio4 = Boolean(mask & 8)
      const atteso = criterio1 && criterio2 && (criterio3 || criterio4)

      const r = calcolaCamIcu({ criterio1, criterio2, criterio3, criterio4 })
      expect(r.positivo).toBe(atteso)
    }
  })
})

describe('calcolaROX', () => {
  it('SpO2 95, FiO2 0.4, FR 22 -> indice e confronto con la soglia 4.88', () => {
    const r = calcolaROX({ spo2: 95, fiO2: 0.4, fr: 22 })
    expect(r.indice).toBeCloseTo(95 / 0.4 / 22, 2)
    expect(r.successoProbabile).toBe(r.indice >= 4.88)
  })

  it('caso chiaramente sopra soglia -> successoProbabile true', () => {
    const r = calcolaROX({ spo2: 98, fiO2: 0.3, fr: 20 })
    expect(r.indice).toBeGreaterThan(4.88)
    expect(r.successoProbabile).toBe(true)
  })

  it('caso chiaramente sotto soglia -> successoProbabile false', () => {
    const r = calcolaROX({ spo2: 90, fiO2: 0.6, fr: 35 })
    expect(r.indice).toBeLessThan(4.88)
    expect(r.successoProbabile).toBe(false)
  })

  it('lancia un errore se FiO2 non e\' una frazione 0-1', () => {
    expect(() => calcolaROX({ spo2: 95, fiO2: 40, fr: 22 })).toThrow(/FiO2/)
  })
})

describe('calcolaAldrete', () => {
  it('punteggio 9 (max 10) -> dimissibile', () => {
    const r = calcolaAldrete([2, 2, 2, 2, 1])
    expect(r.punteggio).toBe(9)
    expect(r.dimissibile).toBe(true)
  })

  it('punteggio sotto 9 -> non dimissibile', () => {
    const r = calcolaAldrete([1, 1, 2, 2, 1])
    expect(r.punteggio).toBe(7)
    expect(r.dimissibile).toBe(false)
  })

  it('lancia un errore se una voce e\' fuori range 0-2', () => {
    expect(() => calcolaAldrete([2, 2, 2, 2, 3])).toThrow(/0 e 2/)
  })

  it('lancia un errore se non sono esattamente 5 voci', () => {
    expect(() => calcolaAldrete([2, 2, 2])).toThrow(/5 voci/)
  })
})

describe('calcolaFour', () => {
  it('somma i 4 componenti (0-4 ciascuno), nessuna interpretazione (soglia non fornita dal JSON)', () => {
    const r = calcolaFour([4, 4, 4, 4])
    expect(r.punteggio).toBe(16)
    expect(r.interpretazione).toBeUndefined()
  })

  it('lancia un errore se un componente e\' fuori range 0-4', () => {
    expect(() => calcolaFour([4, 4, 4, 5])).toThrow(/0 e 4/)
  })
})
