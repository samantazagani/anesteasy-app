import { describe, expect, it } from 'vitest'
import { risolviPeso } from './pesoResolver'

describe('risolviPeso', () => {
  it('usa il peso reale quando la specifica e\' assente', () => {
    const r = risolviPeso(undefined, { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24 })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 70, condizioneApplicata: null })
  })

  it('usa il peso indicato quando la specifica e\' una stringa semplice', () => {
    const r = risolviPeso('IBW', { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24 })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 65, condizioneApplicata: null })
  })

  // Caso reale da farmaci.json: propofol induzione, peso condizionale su BMI>=30.
  it('propofol: paziente non obeso usa il default (reale)', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24 })
    expect(r).toEqual({ chiave: 'reale', valoreKg: 70, condizioneApplicata: null })
  })

  it('propofol: paziente obeso (BMI>=30) passa a IBW', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 120, ibw: 70, lbw: 80, bmi: 34 })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 70, condizioneApplicata: 'BMI>=30' })
  })

  it('con BMI esattamente al confine (30) applica comunque IBW', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 100, ibw: 68, lbw: 75, bmi: 30 })
    expect(r.chiave).toBe('IBW')
  })

  it('condizionale senza BMI noto ricade sul default', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: null, ibw: null, lbw: null, bmi: null })
    expect(r.chiave).toBe('reale')
    expect(r.valoreKg).toBeNull()
  })
})

describe('risolviPeso - paziente pediatrico: IBW/LBW non sono formule valide, si ignorano sempre', () => {
  // IBW (Devine) e LBW (James) sotto ~152 cm producono valori senza senso clinico (es.
  // 50 kg per un bambino di 2 anni): finche' non c'e' un criterio pediatrico dedicato, va
  // sempre usato il peso reale, mai IBW/LBW, indipendentemente da come il farmaco li
  // richiede (stringa semplice o condizione sul BMI).

  it('BMI alto (>=30) su un paziente pediatrico: il peso condizionale usa comunque il peso reale, non IBW', () => {
    // Stesso caso "propofol obeso" del test adulto sopra, ma con categoria pediatrico:
    // un bambino con BMI>=30 non deve ricevere IBW solo perche' il calcolo del BMI supera
    // la soglia adulta di 30 (che non e' comunque il criterio corretto in pediatria).
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 30, ibw: 12, lbw: 14, bmi: 34, categoria: 'pediatrico' })

    expect(r.chiave).toBe('reale')
    expect(r.valoreKg).toBe(30)
    expect(r.condizioneApplicata).toBeNull()
    expect(r.pesoPediatricoEscluso).toBe('IBW')
  })

  it('lo stesso paziente adulto (categoria diversa) continua a passare a IBW come prima', () => {
    const pesoSpec = { tipo: 'condizionale', default: 'reale', eccezione: { condizione: 'BMI>=30', usa: 'IBW' } }
    const r = risolviPeso(pesoSpec, { pesoKg: 120, ibw: 70, lbw: 80, bmi: 34, categoria: 'adulto' })

    expect(r.chiave).toBe('IBW')
    expect(r.valoreKg).toBe(70)
    expect(r.pesoPediatricoEscluso).toBeUndefined()
  })

  it('stringa semplice "IBW" (es. remifentanil, neostigmina) su paziente pediatrico ricade su reale', () => {
    const r = risolviPeso('IBW', { pesoKg: 18, ibw: 16, lbw: 15, bmi: 17, categoria: 'pediatrico' })

    expect(r.chiave).toBe('reale')
    expect(r.valoreKg).toBe(18)
    expect(r.pesoPediatricoEscluso).toBe('IBW')
  })

  it('stringa semplice "LBW" su paziente pediatrico ricade su reale', () => {
    const r = risolviPeso('LBW', { pesoKg: 18, ibw: 16, lbw: 15, bmi: 17, categoria: 'pediatrico' })

    expect(r.chiave).toBe('reale')
    expect(r.valoreKg).toBe(18)
    expect(r.pesoPediatricoEscluso).toBe('LBW')
  })

  it('la stessa stringa semplice "IBW" su un adulto non e\' toccata dalla modifica', () => {
    const r = risolviPeso('IBW', { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24, categoria: 'adulto' })
    expect(r).toEqual({ chiave: 'IBW', valoreKg: 65, condizioneApplicata: null })
  })

  it('un paziente pediatrico con peso gia\' "reale" o senza specifica non cambia comportamento', () => {
    const r1 = risolviPeso('reale', { pesoKg: 18, ibw: 16, lbw: 15, bmi: 17, categoria: 'pediatrico' })
    expect(r1).toEqual({ chiave: 'reale', valoreKg: 18, condizioneApplicata: null })

    const r2 = risolviPeso(undefined, { pesoKg: 18, ibw: 16, lbw: 15, bmi: 17, categoria: 'pediatrico' })
    expect(r2).toEqual({ chiave: 'reale', valoreKg: 18, condizioneApplicata: null })
  })

  it('categoria non nota (null/assente): comportamento invariato, IBW/LBW restano applicabili', () => {
    const r = risolviPeso('IBW', { pesoKg: 70, ibw: 65, lbw: 60, bmi: 24, categoria: null })
    expect(r.chiave).toBe('IBW')
  })
})
