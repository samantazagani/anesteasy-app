import { describe, expect, it } from 'vitest'
import {
  valutaFibrinolisi,
  valutaFibrinogeno,
  valutaPiastrine,
  valutaFattori,
  valutaEparina,
  valutaSequenzaRotem,
} from './rotemCalculator'

describe('valutaFibrinolisi - step 1, EXTEM ML > 15', () => {
  it('EXTEM ML 20% (>15), peso 70 kg -> attivo, acido tranexamico 1050-1400 mg', () => {
    const r = valutaFibrinolisi({ extemMl: 20, pesoKg: 70 })
    expect(r.attivo).toBe(true)
    expect(r.azione).toBe('Acido tranexamico')
    expect(r.dose).toMatchObject({ minMg: 1050, maxMg: 1400 })
    expect(r.doseFissa).toBe('1 g')
  })

  it('EXTEM ML 10% (<=15) -> non attivo', () => {
    const r = valutaFibrinolisi({ extemMl: 10, pesoKg: 70 })
    expect(r.valutato).toBe(true)
    expect(r.attivo).toBe(false)
  })

  it('EXTEM ML esattamente 15 -> non attivo (soglia ">15" esclude il confine)', () => {
    expect(valutaFibrinolisi({ extemMl: 15, pesoKg: 70 }).attivo).toBe(false)
  })

  it('senza peso, la dose resta null ma l\'azione e\' comunque indicata', () => {
    const r = valutaFibrinolisi({ extemMl: 20, pesoKg: null })
    expect(r.attivo).toBe(true)
    expect(r.dose).toBeNull()
  })

  it('valore non inserito -> valutato false (nessun dato, non "non attivo")', () => {
    expect(valutaFibrinolisi({ extemMl: null, pesoKg: 70 }).valutato).toBe(false)
  })
})

describe('valutaFibrinogeno - step 2, FIBTEM A5 < 10', () => {
  it('FIBTEM A5 7 mm (<10), peso 70 kg -> attivo, 1750-3500 mg', () => {
    const r = valutaFibrinogeno({ fibtemA5: 7, pesoKg: 70 })
    expect(r.attivo).toBe(true)
    expect(r.azione).toBe('Fibrinogeno concentrato (o crioprecipitato)')
    expect(r.dose).toMatchObject({ minMg: 1750, maxMg: 3500 })
  })

  it('FIBTEM A5 11 mm (>=10) -> non attivo', () => {
    expect(valutaFibrinogeno({ fibtemA5: 11, pesoKg: 70 }).attivo).toBe(false)
  })

  it('zona grigia 10-12 mm (ostetricia/cardiochirurgia, soglia piu\' alta): segnalata ma non attiva di default', () => {
    const r = valutaFibrinogeno({ fibtemA5: 11, pesoKg: 70 })
    expect(r.attivo).toBe(false)
    expect(r.zonaGrigiaOstetricaCardiochirurgia).toBe(true)
  })
})

describe('valutaPiastrine - step 3, EXTEM A5 < 35 CON fibrinogeno adeguato', () => {
  it('EXTEM A5 28 mm (<35), FIBTEM A5 14 mm (>=10) -> attivo, piastrine', () => {
    const r = valutaPiastrine({ extemA5: 28, fibtemA5: 14 })
    expect(r.attivo).toBe(true)
    expect(r.azione).toBe('Piastrine (1 pool)')
  })

  it('EXTEM A5 28 mm ma FIBTEM A5 7 mm (<10) -> rimandato, correggere prima il fibrinogeno', () => {
    const r = valutaPiastrine({ extemA5: 28, fibtemA5: 7 })
    expect(r.attivo).toBe(false)
    expect(r.rimandato).toBe(true)
    expect(r.interpretazione).toMatch(/fibrinogeno/i)
  })

  it('EXTEM A5 40 mm (>=35) -> non attivo, indipendentemente dal fibrinogeno', () => {
    expect(valutaPiastrine({ extemA5: 40, fibtemA5: 7 }).attivo).toBe(false)
  })
})

describe('valutaFattori - step 4, EXTEM CT > 80, affidabile solo se fibrinogeno adeguato', () => {
  it('EXTEM CT 95 s (>80), FIBTEM A5 14 (adeguato), peso 70 kg -> attivo e affidabile, PCC 1750 UI', () => {
    const r = valutaFattori({ extemCt: 95, fibtemA5: 14, pesoKg: 70 })
    expect(r.attivo).toBe(true)
    expect(r.interpretazioneAffidabile).toBe(true)
    expect(r.azione).toBe('PCC (o plasma)')
    expect(r.dose).toMatchObject({ minMg: 1750, maxMg: null })
  })

  it('EXTEM CT 95 s ma FIBTEM A5 7 (<10, non adeguato) -> attivo ma NON affidabile (rispetta nota_sequenza)', () => {
    const r = valutaFattori({ extemCt: 95, fibtemA5: 7, pesoKg: 70 })
    expect(r.attivo).toBe(true)
    expect(r.interpretazioneAffidabile).toBe(false)
  })

  it('EXTEM CT 70 s (<=80) -> non attivo', () => {
    expect(valutaFattori({ extemCt: 70, fibtemA5: 14, pesoKg: 70 }).attivo).toBe(false)
  })
})

describe('valutaEparina - step 5, INTEM CT > 240 E rapporto INTEM/HEPTEM > 1.25', () => {
  it('INTEM CT 300 s, HEPTEM CT 200 s (rapporto 1.5) -> attivo, protamina', () => {
    const r = valutaEparina({ intemCt: 300, heptemCt: 200 })
    expect(r.rapporto).toBe(1.5)
    expect(r.attivo).toBe(true)
    expect(r.azione).toBe('Protamina (secondo eparina residua)')
  })

  it('INTEM CT 300 s, HEPTEM CT 260 s (rapporto 1.15, sotto 1.25) -> non attivo', () => {
    const r = valutaEparina({ intemCt: 300, heptemCt: 260 })
    expect(r.rapporto).toBeCloseTo(1.15, 2)
    expect(r.attivo).toBe(false)
  })

  it('INTEM CT 200 s (<=240), anche con rapporto alto -> non attivo (entrambe le condizioni servono)', () => {
    const r = valutaEparina({ intemCt: 200, heptemCt: 100 })
    expect(r.rapporto).toBe(2)
    expect(r.attivo).toBe(false)
  })
})

describe('valutaSequenzaRotem - ordine fisso lisi -> fibrinogeno -> piastrine -> fattori -> eparina', () => {
  it('restituisce 5 step nell\'ordine clinico, indipendentemente da quali sono attivi', () => {
    const risultati = valutaSequenzaRotem({
      pesoKg: 70,
      extemMl: 20,
      fibtemA5: 7,
      extemA5: 28,
      extemCt: 95,
      intemCt: 300,
      heptemCt: 200,
    })

    expect(risultati.map((r) => r.nome)).toEqual(['Fibrinolisi', 'Fibrinogeno', 'Piastrine', 'Fattori', 'Eparina'])
    // Paziente con tutto compromesso: fibrinolisi/fibrinogeno attivi, piastrine rimandate
    // (fibrinogeno ancora basso), fattori attivi ma non affidabili, eparina attiva.
    expect(risultati[0].attivo).toBe(true)
    expect(risultati[1].attivo).toBe(true)
    expect(risultati[2].rimandato).toBe(true)
    expect(risultati[3].interpretazioneAffidabile).toBe(false)
    expect(risultati[4].attivo).toBe(true)
  })

  it('campi non inseriti -> ogni step "non valutato", nessun crash', () => {
    const risultati = valutaSequenzaRotem({ pesoKg: 70 })
    expect(risultati.every((r) => r.valutato === false)).toBe(true)
  })

  it('paziente senza problemi di coagulazione -> nessuno step attivo', () => {
    const risultati = valutaSequenzaRotem({
      pesoKg: 70,
      extemMl: 5,
      fibtemA5: 15,
      extemA5: 45,
      extemCt: 60,
      intemCt: 150,
      heptemCt: 150,
    })
    expect(risultati.every((r) => r.attivo === false)).toBe(true)
  })
})
