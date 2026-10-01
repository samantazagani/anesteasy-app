import { describe, expect, it } from 'vitest'
import farmaciData from '../../data/farmaci.json'
import { categoriaEta } from './categoriaEta'
import { selezionaDose } from './selezioneDose'
import { risolviPeso } from './pesoResolver'
import { calcolaDose } from './doseCalculator'

// Verifica end-to-end (selezionaDose -> risolviPeso -> calcolaDose, la stessa catena di
// CalcolatoreDoseBolo.jsx) dei farmaci e delle voci aggiunte al Blocco D: nessuna di queste
// richiede codice nuovo, usano tutte il motore generico gia' esistente — qui si verifica
// che la struttura dati sia davvero compatibile, non solo che "sembri" simile alle altre.

function trovaFarmaco(id) {
  const farmaco = farmaciData.farmaci.find((f) => f.id === id)
  if (!farmaco) throw new Error(`farmaco "${id}" non trovato in data/farmaci.json`)
  return farmaco
}

describe('Tiopentale sodico (nuovo farmaco)', () => {
  it('induzione adulto 3-5 mg/kg, peso reale 70 kg -> 210-350 mg', () => {
    const farmaco = trovaFarmaco('thiopental')
    const selezione = selezionaDose(farmaco.dosi, 'induzione', 'adulto')
    expect(selezione.fallback).toBe(false)
    expect(selezione.candidati).toHaveLength(1)

    const doseScelta = selezione.candidati[0]
    const peso = risolviPeso(doseScelta.peso, { pesoKg: 70, categoria: 'adulto' })
    const risultato = calcolaDose(doseScelta, peso.valoreKg)

    expect(risultato.min).toBe(210)
    expect(risultato.max).toBe(350)
  })

  it('ha anche le varianti pediatrica e anziano (fasce distinte)', () => {
    const farmaco = trovaFarmaco('thiopental')
    expect(selezionaDose(farmaco.dosi, 'induzione', 'pediatrico').fasciaUsata).toBe('pediatrico')
    expect(selezionaDose(farmaco.dosi, 'induzione', 'anziano').fasciaUsata).toBe('anziano')
  })
})

describe('Mannitolo (nuovo farmaco, 3 contesti)', () => {
  const farmaco = trovaFarmaco('mannitolo')

  it('edema_cerebrale 1-2 g/kg, peso reale 70 kg -> 70-140 g', () => {
    const selezione = selezionaDose(farmaco.dosi, 'edema_cerebrale', 'adulto')
    const doseScelta = selezione.candidati[0]
    const peso = risolviPeso(doseScelta.peso, { pesoKg: 70 })
    const risultato = calcolaDose(doseScelta, peso.valoreKg)

    expect(risultato.min).toBe(70)
    expect(risultato.max).toBe(140)
  })

  it('oliguria 0.25 g/kg, peso 70 kg -> 17.5 g', () => {
    const selezione = selezionaDose(farmaco.dosi, 'oliguria', 'adulto')
    const risultato = calcolaDose(selezione.candidati[0], 70)
    expect(risultato.valore).toBe(17.5)
  })

  it('intossicazione 0.5 g/kg, peso 70 kg -> 35 g', () => {
    const selezione = selezionaDose(farmaco.dosi, 'intossicazione', 'adulto')
    const risultato = calcolaDose(selezione.candidati[0], 70)
    expect(risultato.valore).toBe(35)
  })
})

describe('Ketamina IM (voci aggiunte): variante distinta dalla via, nessun codice nuovo necessario', () => {
  const farmaco = trovaFarmaco('ketamina')

  it('contesto "induzione": 2 varianti (IV e IM), distinte per via', () => {
    const selezione = selezionaDose(farmaco.dosi, 'induzione', 'adulto')
    expect(selezione.candidati).toHaveLength(2)
    expect(selezione.candidati.map((d) => d.via).sort()).toEqual(['IM', 'IV'])

    const im = selezione.candidati.find((d) => d.via === 'IM')
    const risultato = calcolaDose(im, 70)
    expect(risultato.min).toBe(280) // 4 mg/kg * 70
    expect(risultato.max).toBe(420) // 6 mg/kg * 70
  })

  it('contesto "sedazione": 2 varianti (IV e IM)', () => {
    const selezione = selezionaDose(farmaco.dosi, 'sedazione', 'adulto')
    expect(selezione.candidati).toHaveLength(2)
    expect(selezione.candidati.map((d) => d.via).sort()).toEqual(['IM', 'IV'])
  })
})

describe('Sugammadex: contesti rinominati per grado di blocco (3 contesti distinti, non piu\' varianti di uno solo)', () => {
  const farmaco = trovaFarmaco('sugammadex')

  it('ciascun contesto risolve a un solo candidato (non serve piu\' il tab "variante")', () => {
    for (const contesto of ['reversal blocco moderato', 'reversal blocco profondo', 'reversal immediato (RSI)']) {
      const selezione = selezionaDose(farmaco.dosi, contesto, 'adulto')
      expect(selezione.candidati).toHaveLength(1)
    }
  })

  it('reversal blocco moderato: 2 mg/kg peso reale, 80 kg -> 160 mg', () => {
    const selezione = selezionaDose(farmaco.dosi, 'reversal blocco moderato', 'adulto')
    const risultato = calcolaDose(selezione.candidati[0], 80)
    expect(risultato.valore).toBe(160)
  })

  it('il campo avvertenze esiste ed e\' un array di stringhe telegrafiche', () => {
    expect(Array.isArray(farmaco.avvertenze)).toBe(true)
    expect(farmaco.avvertenze.length).toBeGreaterThan(0)
    for (const voce of farmaco.avvertenze) {
      expect(typeof voce).toBe('string')
    }
  })
})

describe('Adrenalina anafilassi: nuova variante EV refrattaria accanto a quella IM standard', () => {
  it('adulto: ora 2 candidati, il primo resta la dose IM standard (default invariato per Emergenze.jsx)', () => {
    const farmaco = trovaFarmaco('adrenalina')
    const selezione = selezionaDose(farmaco.dosi, 'anafilassi', 'adulto')

    expect(selezione.candidati).toHaveLength(2)
    expect(selezione.candidati[0].via).toBe('IM')
    expect(selezione.candidati[0].valore).toBe(0.5)
    expect(selezione.candidati[1].via).toBe('EV')
  })
})

describe('Isoprenalina: dose fissa non peso-dipendente accanto a quella su peso', () => {
  it('contesto "infusione": 2 varianti, una su peso (mcg/kg/min) e una fissa (mcg/min)', () => {
    const farmaco = trovaFarmaco('isoprenalina')
    const selezione = selezionaDose(farmaco.dosi, 'infusione', 'adulto')
    expect(selezione.candidati).toHaveLength(2)

    const suPeso = selezione.candidati.find((d) => d.unita === 'mcg/kg/min')
    const fissa = selezione.candidati.find((d) => d.unita === 'mcg/min')
    expect(suPeso).toBeDefined()
    expect(fissa).toBeDefined()

    const risultatoFisso = calcolaDose(fissa, null)
    expect(risultatoFisso.min).toBe(1)
    expect(risultatoFisso.max).toBe(20)
    expect(risultatoFisso.richiedePeso).toBe(false)
  })
})

describe('Categoria pediatrica resta pediatrica anche con le nuove voci (nessuna regressione)', () => {
  it('categoriaEta(6) continua a dare "pediatrico"', () => {
    expect(categoriaEta(6)).toBe('pediatrico')
  })
})
