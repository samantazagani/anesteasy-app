import { describe, expect, it } from 'vitest'
import farmaciData from '../../data/farmaci.json'
import { categoriaEta } from './categoriaEta'
import { selezionaDose } from './selezioneDose'
import { risolviPeso } from './pesoResolver'
import { calcolaDose } from './doseCalculator'

// Riproduce la catena usata da CalcolatoreDoseBolo.jsx (categoriaEta -> selezionaDose ->
// risolviPeso -> calcolaDose) leggendo direttamente data/farmaci.json, su un profilo
// pediatrico realistico (6 anni, 20 kg): verifica che propofol e remifentanil trovino la
// voce pediatrica strutturata invece di ricadere sull'adulto.

const profiloPediatrico = { pesoKg: 20, ibw: null, lbw: null, bmi: 15.1, categoria: categoriaEta(6) }

function trovaFarmaco(id) {
  const farmaco = farmaciData.farmaci.find((f) => f.id === id)
  if (!farmaco) throw new Error(`farmaco "${id}" non trovato in data/farmaci.json`)
  return farmaco
}

describe('Propofol bolo induzione, paziente pediatrico', () => {
  it('sceglie la voce pediatrica dedicata (2.5-3 mg/kg, peso reale), non il fallback adulto', () => {
    const propofol = trovaFarmaco('propofol')
    const selezione = selezionaDose(propofol.dosi, 'induzione', profiloPediatrico.categoria)

    expect(selezione.fallback).toBe(false)
    expect(selezione.fasciaUsata).toBe('pediatrico')
    expect(selezione.candidati).toHaveLength(1)

    const doseScelta = selezione.candidati[0]
    expect(doseScelta).toMatchObject({ min: 2.5, max: 3, unita: 'mg/kg', peso: 'reale' })

    const peso = risolviPeso(doseScelta.peso, profiloPediatrico)
    expect(peso.chiave).toBe('reale')
    expect(peso.valoreKg).toBe(20)

    const risultato = calcolaDose(doseScelta, peso.valoreKg)
    expect(risultato.min).toBe(50)
    expect(risultato.max).toBe(60)
    expect(risultato.unita).toBe('mg')
    expect(risultato.formula).toBe('2.5–3 mg/kg × 20 kg = 50–60 mg')
  })
})

describe('Remifentanil mantenimento, paziente pediatrico', () => {
  it('sceglie la voce pediatrica dedicata (0.1-1 mcg/kg/min) e usa il peso reale', () => {
    const remifentanil = trovaFarmaco('remifentanil')
    const selezione = selezionaDose(remifentanil.dosi, 'mantenimento', profiloPediatrico.categoria)

    expect(selezione.fallback).toBe(false)
    expect(selezione.fasciaUsata).toBe('pediatrico')
    expect(selezione.candidati).toHaveLength(1)

    const doseScelta = selezione.candidati[0]
    expect(doseScelta).toMatchObject({ min: 0.1, max: 1, unita: 'mcg/kg/min', peso: 'reale' })

    // Il peso "reale" e' gia' esplicito nel dato: risolviPeso non deve applicare ne'
    // servirsi del guard pediatrico IBW/LBW (non scatta perche' la voce non chiede IBW/LBW).
    const peso = risolviPeso(doseScelta.peso, profiloPediatrico)
    expect(peso.chiave).toBe('reale')
    expect(peso.valoreKg).toBe(20)
    expect(peso.pesoPediatricoEscluso).toBeUndefined()

    const risultato = calcolaDose(doseScelta, peso.valoreKg)
    expect(risultato.min).toBe(2)
    expect(risultato.max).toBe(20)
    expect(risultato.unita).toBe('mcg/min')
    expect(risultato.formula).toBe('0.1–1 mcg/kg/min × 20 kg = 2–20 mcg/min')
  })
})
