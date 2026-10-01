import { describe, expect, it } from 'vitest'
import { calcBMI, calcIBW, calcLBW, calcPBW, calcABW, round1 } from './anthropometrics'

// Casi verificati con Node prima di scriverli qui (vedi spiegazione nella risposta): niente
// valori "ad occhio", ogni numero e' ricalcolato passo-passo con la stessa formula.
describe('calcPBW - donna e uomo, un caso reale per sesso', () => {
  it('donna, 165 cm -> PBW 56.9 kg (= IBW Devine, stessa formula)', () => {
    const pbw = calcPBW(165, 'F')
    expect(round1(pbw)).toBe(56.9)
    expect(pbw).toBe(calcIBW(165, 'F'))
  })

  it('uomo, 180 cm -> PBW 75 kg (= IBW Devine, stessa formula)', () => {
    const pbw = calcPBW(180, 'M')
    expect(round1(pbw)).toBe(75)
    expect(pbw).toBe(calcIBW(180, 'M'))
  })

  it('un\'altezza pediatrica (110 cm) resta comunque calcolabile: nessun guard eta\' qui dentro', () => {
    // Sotto i 60 pollici (152.4 cm) calcIBW/calcPBW si appiattisce al valore base (45.5
    // donna / 50 uomo) invece di andare negativo: un numero sempre utilizzabile per il Vt,
    // mai null/NaN, a qualunque eta'.
    const pbw = calcPBW(110, 'F')
    expect(pbw).toBe(45.5)
    expect(Number.isFinite(pbw)).toBe(true)
  })
})

describe('calcABW - donna e uomo, un caso reale per sesso', () => {
  it('donna, 165 cm, 80 kg (IBW 56.909...) -> ABW 66.1 kg', () => {
    const ibw = calcIBW(165, 'F')
    const abw = calcABW(80, ibw)
    expect(round1(abw)).toBe(66.1)
  })

  it('uomo, 180 cm, 100 kg (IBW 74.992...) -> ABW 85 kg', () => {
    const ibw = calcIBW(180, 'M')
    const abw = calcABW(100, ibw)
    expect(round1(abw)).toBe(85)
  })

  it('peso reale uguale a IBW -> ABW coincide con IBW (nessuna correzione da applicare)', () => {
    const ibw = calcIBW(170, 'M')
    expect(calcABW(ibw, ibw)).toBeCloseTo(ibw, 6)
  })

  it('senza peso o altezza/sesso validi -> null (niente NaN silenziosi)', () => {
    expect(calcABW(0, 70)).toBeNull()
    expect(calcABW(80, null)).toBeNull()
    expect(calcABW(80, 0)).toBeNull()
  })
})

// calcLBW gia' esisteva: un solo richiamo per completezza del file, non ri-testato a fondo
// (resta testato altrove tramite pesoResolver.test.js).
describe('calcBMI/calcLBW - sanity minima', () => {
  it('calcBMI e calcLBW restano invariati da questo blocco', () => {
    expect(round1(calcBMI(80, 165))).toBe(29.4)
    expect(typeof calcLBW(80, 165, 'F')).toBe('number')
  })
})
