import { describe, expect, it } from 'vitest'
import { calcolaVolumeMassimo, calcolaMargineResiduo } from './anestesiaLocaleCalculator'

// Voci reali da data/anestetici-locali.json (dose_max_mg_kg / tetto_assoluto_mg).
const bupivacaina = {
  id: 'bupivacaina',
  nome: 'Bupivacaina (Marcaina)',
  dose_max_mg_kg: { senza_adrenalina: 2, con_adrenalina: 2.5 },
  tetto_assoluto_mg: { senza_adrenalina: 175, con_adrenalina: 225 },
}

const lidocaina = {
  id: 'lidocaina',
  nome: 'Lidocaina',
  dose_max_mg_kg: { senza_adrenalina: 3, con_adrenalina: 7 },
  tetto_assoluto_mg: { senza_adrenalina: 300, con_adrenalina: 500 },
}

describe('calcolaVolumeMassimo - tetto che limita', () => {
  it('bupivacaina su paziente pesante: 2 mg/kg × peso supera 175 mg, limita il tetto assoluto', () => {
    // 2 mg/kg × 100 kg = 200 mg > 175 mg: il tetto assoluto (non il calcolo per kg) e' il vincolo.
    const risultato = calcolaVolumeMassimo(
      bupivacaina,
      { conAdrenalina: false, pesoKg: 100, concentrazionePercento: 0.5 },
    )

    expect(risultato.doseDaPesoMg).toBe(200)
    expect(risultato.tettoAssolutoMg).toBe(175)
    expect(risultato.doseMaxMg).toBe(175)
    expect(risultato.tettoLimitante).toBe('assoluto')
    expect(risultato.concentrazioneMgMl).toBe(5)
    expect(risultato.volumeMaxMl).toBe(35)
    expect(risultato.formula).toBe(
      'min(2 mg/kg × 100 kg = 200 mg; tetto assoluto 175 mg) = 175 mg → 175 mg ÷ 5 mg/ml = 35 ml',
    )
  })

  it('bupivacaina con adrenalina su paziente pesante: anche qui limita il tetto assoluto (225 mg)', () => {
    // 2.5 mg/kg × 100 kg = 250 mg > 225 mg.
    const risultato = calcolaVolumeMassimo(
      bupivacaina,
      { conAdrenalina: true, pesoKg: 100, concentrazionePercento: 0.5 },
    )

    expect(risultato.doseDaPesoMg).toBe(250)
    expect(risultato.doseMaxMg).toBe(225)
    expect(risultato.tettoLimitante).toBe('assoluto')
    expect(risultato.volumeMaxMl).toBe(45)
  })

  it('lidocaina su paziente normopeso: il calcolo per kg resta sotto il tetto assoluto, limita il peso', () => {
    // 3 mg/kg × 70 kg = 210 mg < 300 mg: il tetto assoluto non interviene.
    const risultato = calcolaVolumeMassimo(
      lidocaina,
      { conAdrenalina: false, pesoKg: 70, concentrazionePercento: 1 },
    )

    expect(risultato.doseDaPesoMg).toBe(210)
    expect(risultato.tettoAssolutoMg).toBe(300)
    expect(risultato.doseMaxMg).toBe(210)
    expect(risultato.tettoLimitante).toBe('peso')
    expect(risultato.concentrazioneMgMl).toBe(10)
    expect(risultato.volumeMaxMl).toBe(21)
  })
})

describe('calcolaVolumeMassimo - conversione concentrazione', () => {
  it('converte la concentrazione percento in mg/ml (1% = 10 mg/ml)', () => {
    const risultato = calcolaVolumeMassimo(
      lidocaina,
      { conAdrenalina: false, pesoKg: 70, concentrazionePercento: 2 },
    )

    expect(risultato.concentrazioneMgMl).toBe(20)
    expect(risultato.volumeMaxMl).toBe(10.5)
  })
})

describe('calcolaVolumeMassimo - residuo (gia\' somministrato opzionale)', () => {
  it('residuo positivo: dose massima 175 mg, gia\' dati 100 mg -> 75 mg residui = 15 ml a 5 mg/ml', () => {
    const r = calcolaVolumeMassimo(
      bupivacaina,
      { conAdrenalina: false, pesoKg: 100, concentrazionePercento: 0.5, giaSomministratoMg: 100 },
    )

    expect(r.doseMaxMg).toBe(175)
    expect(r.residuoMg).toBe(75)
    expect(r.residuoMl).toBe(15)
    expect(r.superaTetto).toBe(false)
    expect(r.formulaResiduo).toBe(
      '175 mg - 100 mg (già somministrato) = 75 mg → 75 mg ÷ 5 mg/ml = 15 ml',
    )
  })

  it('gia\' somministrato supera il tetto: residuo negativo, segnalato (non troncato a zero)', () => {
    const r = calcolaVolumeMassimo(
      bupivacaina,
      { conAdrenalina: false, pesoKg: 100, concentrazionePercento: 0.5, giaSomministratoMg: 200 },
    )

    expect(r.doseMaxMg).toBe(175)
    expect(r.residuoMg).toBe(-25)
    expect(r.residuoMl).toBe(-5)
    expect(r.superaTetto).toBe(true)
  })

  it('senza giaSomministratoMg: residuo resta null (campo opzionale)', () => {
    const r = calcolaVolumeMassimo(lidocaina, { conAdrenalina: false, pesoKg: 70, concentrazionePercento: 1 })
    expect(r.residuoMg).toBeNull()
    expect(r.residuoMl).toBeNull()
    expect(r.formulaResiduo).toBeNull()
  })
})

describe('calcolaMargineResiduo - caso di esempio dal JSON', () => {
  // Esempio da data/anestetici-locali.json > tossicita_additiva.esempio: usato 60% del
  // tetto; scelgo ropivacaina 0.2% (2 mg/ml), dose_max ropi 200 mg -> margine = 0.4*200/2
  // = 40 ml. Verificato indipendentemente con Node prima di fissarlo qui.
  it('60% usato, ropivacaina 0.2% (2 mg/ml), dose_max 200 mg -> 40 ml', () => {
    const r = calcolaMargineResiduo({
      percentualeUsataTotale: 60,
      doseMaxMgAlScelto: 200,
      concentrazioneMgMlAlScelto: 2,
    })

    expect(r.margineMl).toBe(40)
    expect(r.margineMg).toBe(80)
    expect(r.superaTetto).toBe(false)
  })

  it('tetto gia\' superato (percentuale usata > 100): margine negativo, segnalato', () => {
    const r = calcolaMargineResiduo({
      percentualeUsataTotale: 120,
      doseMaxMgAlScelto: 200,
      concentrazioneMgMlAlScelto: 2,
    })

    expect(r.margineMg).toBe(-40)
    expect(r.margineMl).toBe(-20)
    expect(r.superaTetto).toBe(true)
  })

  it('lancia un errore se manca la dose massima o la concentrazione dell\'AL scelto', () => {
    expect(() =>
      calcolaMargineResiduo({ percentualeUsataTotale: 60, doseMaxMgAlScelto: 0, concentrazioneMgMlAlScelto: 2 }),
    ).toThrow(/dose massima/i)
    expect(() =>
      calcolaMargineResiduo({ percentualeUsataTotale: 60, doseMaxMgAlScelto: 200, concentrazioneMgMlAlScelto: 0 }),
    ).toThrow(/concentrazione/i)
  })
})

describe('calcolaVolumeMassimo - errori', () => {
  it('lancia un errore se manca l\'anestetico', () => {
    expect(() =>
      calcolaVolumeMassimo(null, { conAdrenalina: false, pesoKg: 70, concentrazionePercento: 1 }),
    ).toThrow(/anestetico/i)
  })

  it('lancia un errore se manca o non e\' valido il peso', () => {
    expect(() =>
      calcolaVolumeMassimo(lidocaina, { conAdrenalina: false, pesoKg: 0, concentrazionePercento: 1 }),
    ).toThrow(/peso/i)
    expect(() =>
      calcolaVolumeMassimo(lidocaina, { conAdrenalina: false, pesoKg: null, concentrazionePercento: 1 }),
    ).toThrow(/peso/i)
  })

  it('lancia un errore se manca o non e\' valida la concentrazione', () => {
    expect(() =>
      calcolaVolumeMassimo(lidocaina, { conAdrenalina: false, pesoKg: 70, concentrazionePercento: 0 }),
    ).toThrow(/concentrazione/i)
  })
})
