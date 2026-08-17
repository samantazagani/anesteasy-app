import { describe, expect, it } from 'vitest'
import ostetriciaData from '../../data/ostetricia.json'
import { calcolaDose } from './doseCalculator'

// Modulo 4 (Ostetricia) non ha un motore di calcolo dedicato: le due voci
// realmente peso-dipendenti di emorragia_postpartum > calcolatore_peso_pph.peso_dipendenti
// riusano direttamente calcolaDose (gia' testato a fondo in doseCalculator.test.js), nel
// formato { min, max, unita } / { valore, unita } che calcolaDose si aspetta. Tutto il resto
// (calcolatore_peso_pph.dosi_fisse) e' testo di riferimento e NON deve mai passare da qui:
// e' un punto di sicurezza esplicito nel JSON ("nella PPH la maggior parte dei farmaci e a
// DOSE FISSA, non scalare col peso").
describe('calcolatore_peso_pph.peso_dipendenti - voci reali da data/ostetricia.json', () => {
  const { peso_dipendenti: pesoDipendenti } = ostetriciaData.calcolatore_peso_pph

  it('piastrine: 5-10 ml/kg, gravida a termine di 75 kg -> 375-750 ml', () => {
    const voce = pesoDipendenti.find((v) => v.id === 'piastrine')
    const r = calcolaDose(voce, 75)

    expect(r.tipo).toBe('range')
    expect(r.min).toBe(375)
    expect(r.max).toBe(750)
    expect(r.unita).toBe('ml')
  })

  it('volemia gravida: 100 ml/kg, gravida a termine di 75 kg -> 7500 ml', () => {
    const voce = pesoDipendenti.find((v) => v.id === 'volemia_gravida')
    const r = calcolaDose(voce, 75)

    expect(r.tipo).toBe('singolo')
    expect(r.valore).toBe(7500)
    expect(r.unita).toBe('ml')
  })

  it('nessun\'altra voce oltre piastrine/volemia_gravida e\' peso-dipendente (le altre restano dosi fisse)', () => {
    expect(pesoDipendenti.map((v) => v.id).sort()).toEqual(['piastrine', 'volemia_gravida'])
  })
})
