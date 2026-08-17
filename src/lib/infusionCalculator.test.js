import { describe, expect, it } from 'vitest'
import {
  calcolaConcentrazione,
  calcolaInfusione,
  calcolaInfusioneOraria,
  calcolaMlOrariDaConcentrazione,
} from './infusionCalculator'

describe('calcolaConcentrazione', () => {
  it('4 mg in 250 ml -> 16 mcg/ml (diluizione tipica noradrenalina)', () => {
    expect(calcolaConcentrazione(4, 250)).toBe(16)
  })

  it('lancia un errore se mg o ml non sono positivi', () => {
    expect(() => calcolaConcentrazione(0, 250)).toThrow(/positivi/i)
    expect(() => calcolaConcentrazione(4, 0)).toThrow(/positivi/i)
    expect(() => calcolaConcentrazione(-1, 250)).toThrow(/positivi/i)
  })
})

describe('calcolaInfusione - direzione dose -> ml/h', () => {
  // Caso reale verificato a mano: noradrenalina 0.1 mcg/kg/min, 70 kg,
  // diluizione 4 mg in 250 ml (16 mcg/ml) -> 420 mcg/h -> 26.25 ml/h.
  it('noradrenalina 0.1 mcg/kg/min su 70 kg, diluizione 4 mg/250 ml', () => {
    const concentrazioneMcgMl = calcolaConcentrazione(4, 250)
    const r = calcolaInfusione({ pesoKg: 70, concentrazioneMcgMl, doseMcgKgMin: 0.1 })

    expect(r.direzione).toBe('dose->mlH')
    expect(r.mlH).toBe(26.25)
    expect(r.doseMcgKgMin).toBe(0.1)
    expect(r.formula).toBe(
      '0.1 mcg/kg/min × 70 kg × 60 = 420 mcg/h ÷ 16 mcg/ml = 26.25 ml/h',
    )
  })

  it('lancia un errore se manca il peso o la concentrazione', () => {
    expect(() => calcolaInfusione({ concentrazioneMcgMl: 16, doseMcgKgMin: 0.1 })).toThrow(/peso/i)
    expect(() => calcolaInfusione({ pesoKg: 70, doseMcgKgMin: 0.1 })).toThrow(/concentrazione/i)
  })
})

describe('calcolaInfusione - direzione ml/h -> dose', () => {
  // Stesso scenario reale, ma partendo dalla velocita' di infusione impostata in pompa.
  it('26.25 ml/h su 70 kg, diluizione 4 mg/250 ml -> 0.1 mcg/kg/min', () => {
    const concentrazioneMcgMl = calcolaConcentrazione(4, 250)
    const r = calcolaInfusione({ pesoKg: 70, concentrazioneMcgMl, mlH: 26.25 })

    expect(r.direzione).toBe('mlH->dose')
    expect(r.doseMcgKgMin).toBe(0.1)
    expect(r.mlH).toBe(26.25)
    expect(r.formula).toBe(
      '26.25 ml/h × 16 mcg/ml = 420 mcg/h ÷ 60 ÷ 70 kg = 0.1 mcg/kg/min',
    )
  })

  it('e\' l\'inversa esatta della direzione dose -> ml/h (round-trip)', () => {
    const concentrazioneMcgMl = 20
    const andata = calcolaInfusione({ pesoKg: 82, concentrazioneMcgMl, doseMcgKgMin: 0.05 })
    const ritorno = calcolaInfusione({ pesoKg: 82, concentrazioneMcgMl, mlH: andata.mlH })
    expect(ritorno.doseMcgKgMin).toBeCloseTo(0.05, 5)
  })
})

describe('calcolaInfusione - validazione input', () => {
  it('richiede esattamente una tra doseMcgKgMin e mlH (nessuna delle due)', () => {
    expect(() => calcolaInfusione({ pesoKg: 70, concentrazioneMcgMl: 16 })).toThrow(/esattamente uno/i)
  })

  it('richiede esattamente una tra doseMcgKgMin e mlH (entrambe insieme)', () => {
    expect(() =>
      calcolaInfusione({ pesoKg: 70, concentrazioneMcgMl: 16, doseMcgKgMin: 0.1, mlH: 26.25 }),
    ).toThrow(/esattamente uno/i)
  })

  it('rifiuta valori non positivi per la grandezza di partenza', () => {
    expect(() => calcolaInfusione({ pesoKg: 70, concentrazioneMcgMl: 16, doseMcgKgMin: 0 })).toThrow()
    expect(() => calcolaInfusione({ pesoKg: 70, concentrazioneMcgMl: 16, mlH: -5 })).toThrow()
  })
})

describe('calcolaInfusioneOraria - direzione dose -> ml/h', () => {
  // Caso reale verificato a mano: propofol mantenimento, dose 3 mg/kg/h (il
  // "consigliato_min" di farmaci.json), 70 kg -> 210 mg/h.
  it('propofol 3 mg/kg/h su 70 kg, PPF 1% (10 mg/ml) -> 21 ml/h', () => {
    const r = calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10, doseMgKgH: 3 })

    expect(r.direzione).toBe('dose->mlH')
    expect(r.mlH).toBe(21)
    expect(r.doseMgKgH).toBe(3)
    expect(r.formula).toBe('3 mg/kg/h × 70 kg = 210 mg/h ÷ 10 mg/ml = 21 ml/h')
  })

  it('stessa dose/peso ma PPF 2% (20 mg/ml) -> 10.5 ml/h (meta\' del volume)', () => {
    const r = calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 20, doseMgKgH: 3 })

    expect(r.mlH).toBe(10.5)
    expect(r.formula).toBe('3 mg/kg/h × 70 kg = 210 mg/h ÷ 20 mg/ml = 10.5 ml/h')
  })

  it('lancia un errore se manca il peso o la concentrazione', () => {
    expect(() => calcolaInfusioneOraria({ concentrazioneMgMl: 10, doseMgKgH: 3 })).toThrow(/peso/i)
    expect(() => calcolaInfusioneOraria({ pesoKg: 70, doseMgKgH: 3 })).toThrow(/concentrazione/i)
  })
})

describe('calcolaInfusioneOraria - direzione ml/h -> dose', () => {
  it('21 ml/h su 70 kg, PPF 1% (10 mg/ml) -> 3 mg/kg/h', () => {
    const r = calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10, mlH: 21 })

    expect(r.direzione).toBe('mlH->dose')
    expect(r.doseMgKgH).toBe(3)
    expect(r.formula).toBe('21 ml/h × 10 mg/ml = 210 mg/h ÷ 70 kg = 3 mg/kg/h')
  })

  it('e\' l\'inversa esatta della direzione dose -> ml/h (round-trip)', () => {
    const concentrazioneMgMl = 20
    const andata = calcolaInfusioneOraria({ pesoKg: 82, concentrazioneMgMl, doseMgKgH: 6 })
    const ritorno = calcolaInfusioneOraria({ pesoKg: 82, concentrazioneMgMl, mlH: andata.mlH })
    expect(ritorno.doseMgKgH).toBeCloseTo(6, 5)
  })
})

describe('calcolaInfusioneOraria - validazione input', () => {
  it('richiede esattamente una tra doseMgKgH e mlH', () => {
    expect(() => calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10 })).toThrow(/esattamente uno/i)
    expect(() =>
      calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10, doseMgKgH: 3, mlH: 21 }),
    ).toThrow(/esattamente uno/i)
  })

  it('rifiuta valori non positivi per la grandezza di partenza', () => {
    expect(() => calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10, doseMgKgH: 0 })).toThrow()
    expect(() => calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10, mlH: -1 })).toThrow()
  })
})

describe('calcolaMlOrariDaConcentrazione', () => {
  // Caso reale da data/calcolatori-ti.json > infusione_da_dose_oraria (Modulo 6): 1 g
  // (=1000 mg) in 50 ml, dose 125 mg/h -> 20 mg/ml -> 6.25 ml/h.
  it('1000 mg in 50 ml (20 mg/ml), dose 125 mg/h -> 6.25 ml/h', () => {
    const r = calcolaMlOrariDaConcentrazione({ concentrazioneMgMl: 1000 / 50, doseMgOra: 125 })

    expect(r.mlH).toBe(6.25)
    expect(r.formula).toBe('125 mg/h ÷ 20 mg/ml = 6.25 ml/h')
  })

  // Caso reale del calcolatore "Dose oraria -> ml/h" nel Modulo 1 (γ/ml/h), accanto a
  // γ/kg/min <-> ml/h: 500 mg in 40 ml, dose 2 mg/h -> 12.5 mg/ml -> 0.16 ml/h.
  it('500 mg in 40 ml (12.5 mg/ml), dose 2 mg/h -> 0.16 ml/h', () => {
    const r = calcolaMlOrariDaConcentrazione({ concentrazioneMgMl: 500 / 40, doseMgOra: 2 })

    expect(r.mlH).toBe(0.16)
    expect(r.formula).toBe('2 mg/h ÷ 12.5 mg/ml = 0.16 ml/h')
  })

  it('e\' lo stesso nucleo aritmetico usato da calcolaInfusioneOraria (peso × dose/kg = dose oraria)', () => {
    const oraria = calcolaInfusioneOraria({ pesoKg: 70, concentrazioneMgMl: 10, doseMgKgH: 3 })
    const daConcentrazione = calcolaMlOrariDaConcentrazione({ concentrazioneMgMl: 10, doseMgOra: 3 * 70 })

    expect(daConcentrazione.mlH).toBe(oraria.mlH)
  })

  it('lancia un errore se concentrazione o dose oraria mancano o non sono validi', () => {
    expect(() => calcolaMlOrariDaConcentrazione({ concentrazioneMgMl: 0, doseMgOra: 125 })).toThrow(/concentrazione/i)
    expect(() => calcolaMlOrariDaConcentrazione({ concentrazioneMgMl: 20, doseMgOra: 0 })).toThrow(/dose oraria/i)
  })
})
