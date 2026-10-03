import { describe, expect, it } from 'vitest'
import anestetici from '../../data/anestetici-locali.json'
import {
  ZONE,
  costruisciMappa,
  descrizioneBlocco,
  etichettaRegione,
  noteRegioni,
  regioneDellaZona,
  regioniRaggiungibili,
  sessoDaProfilo,
  suggerisciBlocchi,
  testoCopertura,
  zonaVisibile,
} from './mappaBlocchi'

const mappa = costruisciMappa(anestetici)
const nomi = (sel) => suggerisciBlocchi(sel, mappa).chosen.map((c) => c.name)

describe('coerenza dei dati (data/anestetici-locali.json)', () => {
  it('ogni regione ha id univoco, etichetta e almeno un blocco noto al catalogo', () => {
    const ids = anestetici.blocchi_per_regione.regioni.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of Object.values(mappa.regioni)) {
      expect(mappa.etichette[r.id], `etichetta di ${r.id}`).toBeTruthy()
      expect(r.blocchi.length).toBeGreaterThan(0)
      for (const b of r.blocchi) expect(mappa.blocchi[b], `${b} (regione ${r.id})`).toBeDefined()
    }
  })

  it('ogni regione citata da un blocco (copre) ha un\'etichetta', () => {
    for (const [nome, b] of Object.entries(mappa.blocchi)) {
      for (const r of b.copre) expect(mappa.etichette[r], `${nome} copre ${r}`).toBeDefined()
    }
  })

  // Eccezioni accettate: blocco elencato per la regione ma che, per il catalogo, non la copre.
  // L'LFCN per l'anca e' un complemento solo cutaneo (cute dell'incisione laterale): la sua
  // descrizione lo dice. Ogni altra incoerenza fa fallire il test.
  const ECCEZIONI_ACCETTATE = ['anca|Cutaneo laterale della coscia (LFCN)']

  it("i blocchi elencati per una regione la coprono, salvo l'eccezione accettata (LFCN per l'anca)", () => {
    const trovate = []
    for (const r of Object.values(mappa.regioni)) {
      for (const b of r.blocchi) if (!mappa.blocchi[b].copre.includes(r.id)) trovate.push(`${r.id}|${b}`)
    }
    for (const t of trovate) expect(ECCEZIONI_ACCETTATE, `incoerenza nuova: ${t}`).toContain(t)
  })

  it('"vista" del JSON coincide con le regioni davvero selezionabili sulla figura', () => {
    for (const vista of ['anteriore', 'posteriore']) {
      const attese = Object.values(mappa.regioni).filter((r) => r.vista.includes(vista)).map((r) => r.id).sort()
      expect([...regioniRaggiungibili('donna', vista)].sort()).toEqual(attese)
    }
  })
})

describe('sesso della figura dal profilo', () => {
  it('F -> donna, M -> uomo, profilo senza sesso -> nessuna indicazione', () => {
    expect(sessoDaProfilo('F')).toBe('donna')
    expect(sessoDaProfilo('M')).toBe('uomo')
    expect(sessoDaProfilo(null)).toBeNull()
    expect(sessoDaProfilo(undefined)).toBeNull()
    expect(sessoDaProfilo('')).toBeNull()
  })
})

describe('zone e viste', () => {
  const zona = (parte) => ZONE.find((z) => z.parte === parte)

  it('mammella solo donna/anteriore; inguine e perineo solo anteriore', () => {
    expect(zonaVisibile(zona('breast'), 'donna', 'anteriore')).toBe(true)
    expect(zonaVisibile(zona('breast'), 'uomo', 'anteriore')).toBe(false)
    expect(zonaVisibile(zona('breast'), 'donna', 'posteriore')).toBe(false)
    expect(zonaVisibile(zona('inguine'), 'uomo', 'anteriore')).toBe(true)
    expect(zonaVisibile(zona('perineo'), 'uomo', 'posteriore')).toBe(false)
  })

  it('la stessa parte seleziona regioni diverse davanti e dietro', () => {
    expect(regioneDellaZona(zona('chest'), 'uomo', 'anteriore')).toBe('torace')
    expect(regioneDellaZona(zona('chest'), 'uomo', 'posteriore')).toBe('dorso')
    expect(regioneDellaZona(zona('knee'), 'uomo', 'anteriore')).toBe('coscia')
    expect(regioneDellaZona(zona('knee'), 'uomo', 'posteriore')).toBe('ginocchioPost')
    expect(regioneDellaZona(zona('abdomen'), 'donna', 'posteriore')).toBe('lombare')
  })

  it('un uomo non puo selezionare la mammella (la selezione si ripulisce al cambio sesso)', () => {
    expect(regioniRaggiungibili('donna', 'anteriore').has('mammella')).toBe(true)
    expect(regioniRaggiungibili('uomo', 'anteriore').has('mammella')).toBe(false)
  })

  it('ogni zona attiva punta a una regione esistente nei dati', () => {
    for (const sesso of ['uomo', 'donna']) {
      for (const vista of ['anteriore', 'posteriore']) {
        for (const z of ZONE) {
          const r = regioneDellaZona(z, sesso, vista)
          if (r) expect(mappa.regioni[r], `${z.parte} ${sesso} ${vista}`).toBeDefined()
        }
      }
    }
  })
})

describe('suggerisciBlocchi: esempi clinici documentati in logica_combinazione', () => {
  it('spalla + braccio + avambraccio + mano -> Interscalenico + Ascellare (schema prossimale + distale)', () => {
    expect(nomi(['spalla', 'braccio', 'avambraccio', 'mano'])).toEqual(['Interscalenico', 'Ascellare'])
  })

  it('braccio + avambraccio + mano -> un solo blocco, il Sovraclaveare', () => {
    const r = suggerisciBlocchi(['braccio', 'avambraccio', 'mano'], mappa)
    expect(r.chosen.map((c) => c.name)).toEqual(['Sovraclaveare'])
    expect(r.uncovered).toEqual([])
  })

  it('anca + coscia (femore) -> Femorale, mai Sciatico (copre solo la coscia posteriore)', () => {
    expect(nomi(['anca', 'coscia'])).toEqual(['Femorale'])
    expect(nomi(['anca', 'coscia'])).not.toContain('Sciatico')
  })

  it('coscia + gamba + piede -> Femorale + Popliteo', () => {
    // l'ordine segue la priorita' clinica (distale prima), non conta per il significato
    expect(nomi(['coscia', 'gamba', 'piede']).sort()).toEqual(['Femorale', 'Popliteo (sciatico)'])
  })

  it('torace + addome -> Paravertebrale (un solo blocco, prima scelta)', () => {
    expect(nomi(['torace', 'addome'])).toEqual(['Paravertebrale'])
  })

  it('coscia posteriore + gluteo + piede -> Sciatico da solo', () => {
    expect(nomi(['cosciaPost', 'gluteo', 'piede'])).toEqual(['Sciatico'])
  })

  it('regione lombare: il Paravertebrale la copre, quindi torace + lombare = un solo blocco', () => {
    expect(mappa.blocchi.Paravertebrale.copre).toContain('lombare')
    expect(nomi(['torace', 'lombare'])).toEqual(['Paravertebrale'])
  })

  it('parete toracica posteriore (dorso): ESP prima del Paravertebrale, anche in combinazione', () => {
    expect(mappa.regioni.dorso.blocchi.slice(0, 2)).toEqual(['ESP', 'Paravertebrale'])
    expect(nomi(['dorso'])).toEqual(['ESP'])
    expect(nomi(['dorso', 'lombare'])).toEqual(['ESP'])
    expect(nomi(['spalla', 'dorso']).sort()).toEqual(['ESP', 'Interscalenico'])
  })

  it('parete toracica anteriore (torace): resta Paravertebrale prima scelta', () => {
    expect(mappa.regioni.torace.blocchi[0]).toBe('Paravertebrale')
    expect(nomi(['torace', 'addome'])).toEqual(['Paravertebrale'])
  })

  it('spalla + torace + lombare: due blocchi (Paravertebrale + Interscalenico), non tre', () => {
    expect(nomi(['spalla', 'torace', 'lombare']).sort()).toEqual(['Interscalenico', 'Paravertebrale'])
  })

  it('ogni blocco scelto riporta solo le regioni selezionate che copre', () => {
    const { chosen } = suggerisciBlocchi(['spalla', 'braccio', 'avambraccio', 'mano'], mappa)
    expect(chosen[0]).toEqual({ name: 'Interscalenico', copre: ['spalla', 'braccio'] })
    expect(chosen[1]).toEqual({ name: 'Ascellare', copre: ['avambraccio', 'mano'] })
  })

  it('con i dati attuali ogni coppia di regioni e coperta (nessun "valuta anestesia generale")', () => {
    const ids = Object.keys(mappa.regioni)
    for (const a of ids) for (const b of ids) if (a < b) expect(suggerisciBlocchi([a, b], mappa).uncovered).toEqual([])
  })
})

describe('suggerisciBlocchi: regioni scoperte', () => {
  // Dati sintetici: la regione "z" non e coperta da nessun blocco elencato per le altre.
  const finta = {
    regioni: {
      x: { id: 'x', blocchi: ['BX'] },
      z: { id: 'z', blocchi: [] },
    },
    blocchi: { BX: { copre: ['x'] } },
    etichette: {},
  }

  it('le regioni senza blocco restano in uncovered e il resto viene comunque coperto', () => {
    expect(suggerisciBlocchi(['x', 'z'], finta)).toEqual({
      chosen: [{ name: 'BX', copre: ['x'] }],
      uncovered: ['z'],
    })
  })
})

describe('testi per il pannello', () => {
  it("l'LFCN e presentato per l'anca come complemento solo cutaneo", () => {
    expect(descrizioneBlocco(mappa, 'Cutaneo laterale della coscia (LFCN)')).toMatch(/complemento cutaneo.*non anestetizza l'articolazione/)
  })

  it('copertura e descrizione di un blocco, con le etichette leggibili', () => {
    expect(testoCopertura(mappa, 'Interscalenico')).toBe('Spalla, Braccio / omero')
    expect(descrizioneBlocco(mappa, 'Interscalenico')).toMatch(/plesso brachiale prossimale/)
    expect(testoCopertura(mappa, 'Non esiste')).toBe('')
  })

  it('braccioMediale non e selezionabile ma ha un\'etichetta (serve a PECS e Intercostobrachiale)', () => {
    expect(mappa.regioni.braccioMediale).toBeUndefined()
    expect(etichettaRegione(mappa, 'braccioMediale')).toBe('Braccio (cute mediale)')
    expect(testoCopertura(mappa, 'PECS I-II')).toContain('Braccio (cute mediale)')
  })

  it('la nota di sicurezza sulla cute mediale del braccio compare solo se si seleziona il braccio', () => {
    expect(noteRegioni(mappa, ['braccio'])[0]).toMatch(/NON coperta dai blocchi del plesso/)
    expect(noteRegioni(mappa, ['spalla', 'mano'])).toEqual([])
  })
})
