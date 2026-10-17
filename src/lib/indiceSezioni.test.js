import { describe, expect, it } from 'vitest'
import { sezioneAttiva } from './indiceSezioni'

describe('sezioneAttiva', () => {
  it('in cima, prima che una sezione raggiunga la linea, e attiva la prima', () => {
    expect(sezioneAttiva([300, 900, 1500], 120)).toBe(0)
    expect(sezioneAttiva([], 120)).toBe(0)
  })

  it('e attiva l ultima sezione il cui bordo alto ha superato la linea', () => {
    expect(sezioneAttiva([-700, -100, 500], 120)).toBe(1)
    expect(sezioneAttiva([-700, -100, 100], 120)).toBe(2)
    expect(sezioneAttiva([-2000, -1500, -900], 120)).toBe(2)
  })

  it('con due colonne affiancate vince la sezione piu vicina alla linea, a parita la prima', () => {
    // colonna sinistra: sezioni 0 e 2; colonna destra: 1 e 3 (ordine di documento)
    expect(sezioneAttiva([-400, -100, 50, 80], 120)).toBe(3)
    expect(sezioneAttiva([20, 20, 600, 600], 120)).toBe(0)
  })

  it('le sezioni dentro un elemento sticky non possono diventare correnti scorrendo', () => {
    // 0 = parametri fissi (sempre a 140), 1 e 2 = calcolatori che passano sotto la linea
    expect(sezioneAttiva([140, 90, 700], 147)).toBe(0)
    expect(sezioneAttiva([140, 90, 700], 147, { escludi: [true, false, false] })).toBe(1)
    expect(sezioneAttiva([140], 147, { escludi: [true] })).toBe(0)
  })

  it('in fondo alla pagina e corrente l ultima sezione (non sticky), anche se non raggiunge la linea', () => {
    expect(sezioneAttiva([-900, -300, 400], 147, { inFondo: true })).toBe(2)
    expect(sezioneAttiva([-900, -300, 400], 147, { inFondo: false })).toBe(1)
    expect(sezioneAttiva([140, 90, 700], 147, { escludi: [false, false, true], inFondo: true })).toBe(1)
  })
})
