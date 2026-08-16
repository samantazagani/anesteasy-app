import { describe, expect, it } from 'vitest'
import { calcolaVolumeMassimo } from './anestesiaLocaleCalculator'

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
