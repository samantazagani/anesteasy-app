import { describe, expect, it } from 'vitest'
import profilassiData from '../../data/profilassi-antibiotica.json'
import { categoriaEta } from './categoriaEta'
import { risolviPeso } from './pesoResolver'
import { calcolaDose, formatoRisultato } from './doseCalculator'

// Riproduce la catena usata da CalcolatoreAntibiotici.jsx > CalcCefazolinaPediatrica
// (risolviPeso -> calcolaDose) leggendo direttamente data/profilassi-antibiotica.json:
// l'unica dose "pulita" (numero + unita) di tutto il blocco profilassi/terapia, le altre
// restano testo libero non fatto passare per il motore di calcolo.

describe('Cefazolina pediatrica (data/profilassi-antibiotica.json > prima_scelta.dose_pediatrica)', () => {
  const dosePediatrica = profilassiData.prima_scelta.dose_pediatrica

  it('la voce JSON e\' un numero pulito (30 mg/kg, peso reale), non testo libero', () => {
    expect(dosePediatrica).toMatchObject({ valore: 30, unita: 'mg/kg', peso: 'reale' })
  })

  it('bambino 20 kg -> 600 mg, peso reale (nessun fallback su IBW/LBW)', () => {
    const categoria = categoriaEta(6)
    expect(categoria).toBe('pediatrico')

    const peso = risolviPeso(dosePediatrica.peso, { pesoKg: 20, ibw: null, lbw: null, bmi: null, categoria })
    expect(peso).toEqual({ chiave: 'reale', valoreKg: 20, condizioneApplicata: null })

    const risultato = calcolaDose(dosePediatrica, peso.valoreKg)
    expect(risultato.valore).toBe(600)
    expect(risultato.unita).toBe('mg')
    expect(formatoRisultato(risultato)).toBe('600 mg')
  })

  it('bambino piu\' pesante (40 kg) -> 1200 mg, ancora sotto il tetto adulto di 2 g', () => {
    const peso = risolviPeso(dosePediatrica.peso, {
      pesoKg: 40,
      ibw: null,
      lbw: null,
      bmi: null,
      categoria: categoriaEta(12),
    })
    const risultato = calcolaDose(dosePediatrica, peso.valoreKg)

    expect(risultato.valore).toBe(1200)
    expect(risultato.valore).toBeLessThan(2000)
  })

  it('un bambino di peso estremo (70 kg) supererebbe il tetto adulto di 2 g (2100 mg): la nota "non superare la dose adulto" del JSON diventa rilevante', () => {
    const peso = risolviPeso(dosePediatrica.peso, {
      pesoKg: 70,
      ibw: null,
      lbw: null,
      bmi: null,
      categoria: categoriaEta(16),
    })
    const risultato = calcolaDose(dosePediatrica, peso.valoreKg)

    expect(risultato.valore).toBe(2100)
    expect(risultato.valore).toBeGreaterThan(2000)
  })
})

describe('Contenuto di riferimento (profilassi/terapia): resta testo libero, non passa per calcolaDose', () => {
  it('la dose adulto di cefazolina e\' testo, non un numero da moltiplicare per il peso', () => {
    const { dose_adulto: doseAdulto } = profilassiData.prima_scelta
    expect(typeof doseAdulto.standard).toBe('string')
    expect(typeof doseAdulto.peso_alto).toBe('string')
  })

  it('terapia_antibiotica ha 3 farmaci dal prontuario, ciascuno con dosi testuali eterogenee', () => {
    const { farmaci } = profilassiData.terapia_antibiotica
    expect(farmaci.map((f) => f.id)).toEqual(['vancomicina', 'meropenem', 'piperacillina-tazobactam'])
    for (const farmaco of farmaci) {
      expect(farmaco.fonte).toBe('prontuario')
      expect(farmaco.verificato).toBe(false)
    }
  })
})
