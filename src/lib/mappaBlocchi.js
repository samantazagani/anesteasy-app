// Motore della "Mappa dei blocchi" (omino cliccabile): porta 1:1 la logica del prototipo
// omino-blocchi v8. I DATI (regioni, blocchi, copertura, note) vivono solo in
// data/anestetici-locali.json (blocchi_per_regione + blocchi_catalogo): qui ci sono la
// geometria delle zone sulla figura e gli algoritmi, mai una copia dei dati clinici.

/** Dimensioni delle 4 immagini (public/fig/{sesso}-{vista}.png): le zone sono in questo spazio. */
export const FIGURA = { larghezza: 1024, altezza: 559 }

/** Porzione visibile: il corpo occupa x 396-629 (invariato tra le 4 immagini). Le zone non cambiano. */
export const RITAGLIO_FIGURA = { x: 376, y: 0, larghezza: 272, altezza: 559 }

/**
 * Zone cliccabili, ricalibrate pixel-per-pixel sulle 4 immagini reali. L'ordine conta: le
 * zone successive stanno sopra le precedenti (la mammella copre parte del torace).
 * `solo`: 'donna-anteriore' (mammella) | 'anteriore' (inguine, perineo).
 */
export const ZONE = [
  { parte: 'deltoid', x: 428, y: 108, w: 50, h: 42 },
  { parte: 'deltoid', x: 546, y: 108, w: 50, h: 42 },
  { parte: 'armUpper', x: 412, y: 150, w: 53, h: 132 },
  { parte: 'armUpper', x: 559, y: 150, w: 53, h: 132 },
  { parte: 'forearm', x: 400, y: 282, w: 45, h: 31 },
  { parte: 'forearm', x: 579, y: 282, w: 45, h: 31 },
  { parte: 'hand', x: 388, y: 313, w: 52, h: 34 },
  { parte: 'hand', x: 584, y: 313, w: 52, h: 34 },
  { parte: 'chest', x: 463, y: 150, w: 98, h: 100 },
  { parte: 'abdomen', x: 453, y: 250, w: 118, h: 55 },
  { parte: 'breast', x: 463, y: 165, w: 98, h: 65, solo: 'donna-anteriore' },
  { parte: 'inguine', x: 478, y: 337, w: 68, h: 23, solo: 'anteriore' },
  { parte: 'perineo', x: 498, y: 355, w: 28, h: 23, solo: 'anteriore' },
  { parte: 'hip', x: 448, y: 300, w: 64, h: 37 },
  { parte: 'hip', x: 512, y: 300, w: 64, h: 37 },
  { parte: 'thigh', x: 455, y: 337, w: 55, h: 93 },
  { parte: 'thigh', x: 512, y: 337, w: 55, h: 93 },
  { parte: 'knee', x: 462, y: 428, w: 41, h: 40 },
  { parte: 'knee', x: 521, y: 428, w: 41, h: 40 },
  { parte: 'calf', x: 467, y: 465, w: 33, h: 35 },
  { parte: 'calf', x: 524, y: 465, w: 33, h: 35 },
  { parte: 'foot', x: 455, y: 497, w: 45, h: 53 },
  { parte: 'foot', x: 525, y: 497, w: 45, h: 53 },
]

/** Parte del corpo -> id regione (id come in blocchi_per_regione.regioni[].id), per vista. */
export const REGIONE_PER_PARTE = {
  anteriore: {
    deltoid: 'spalla', armUpper: 'braccio', forearm: 'avambraccio', hand: 'mano',
    chest: 'torace', breast: 'mammella', abdomen: 'addome', inguine: 'inguine', perineo: 'perineo',
    hip: 'anca', thigh: 'coscia', knee: 'coscia', calf: 'gamba', foot: 'piede',
  },
  posteriore: {
    deltoid: 'spalla', armUpper: 'braccio', forearm: 'avambraccio', hand: 'mano',
    chest: 'dorso', abdomen: 'lombare', hip: 'gluteo', thigh: 'cosciaPost', knee: 'ginocchioPost',
    calf: 'gamba', foot: 'piede',
  },
}

/** La zona esiste per questo paziente/vista? (mammella solo donna-anteriore; inguine/perineo solo anteriore) */
export function zonaVisibile(zona, sesso, vista) {
  if (zona.solo === 'donna-anteriore') return sesso === 'donna' && vista === 'anteriore'
  if (zona.solo === 'anteriore') return vista === 'anteriore'
  return true
}

/** Id della regione che la zona seleziona in quella vista (undefined se la zona non e' attiva). */
export function regioneDellaZona(zona, sesso, vista) {
  if (!zonaVisibile(zona, sesso, vista)) return undefined
  return REGIONE_PER_PARTE[vista][zona.parte]
}

/** Regioni selezionabili con questo sesso/vista (per ripulire la selezione quando cambiano). */
export function regioniRaggiungibili(sesso, vista) {
  const insieme = new Set()
  for (const zona of ZONE) {
    const regione = regioneDellaZona(zona, sesso, vista)
    if (regione) insieme.add(regione)
  }
  return insieme
}

/** Dati del JSON -> strutture di lavoro: regioni per id (con etichetta) e catalogo blocchi. */
export function costruisciMappa(anestetici) {
  const { etichette_regioni: etichette, blocchi } = anestetici.blocchi_catalogo
  const regioni = {}
  for (const r of anestetici.blocchi_per_regione.regioni) {
    regioni[r.id] = {
      id: r.id,
      label: etichette[r.id] ?? r.regione,
      vista: r.vista,
      blocchi: r.blocchi,
      chirurgie: r.chirurgie,
      note: r.note,
    }
  }
  return { regioni, blocchi, etichette }
}

/** Etichetta di una regione, anche per quelle che non sono selezionabili (es. braccioMediale). */
export function etichettaRegione(mappa, id) {
  return mappa.regioni[id]?.label ?? mappa.etichette[id] ?? id
}

/** Cosa copre un blocco, come testo ("Spalla, Braccio / omero"). */
export function testoCopertura(mappa, nomeBlocco) {
  const info = mappa.blocchi[nomeBlocco]
  return info ? info.copre.map((r) => etichettaRegione(mappa, r)).join(', ') : ''
}

/** Territorio coperto da un blocco (campo `descrizione` del catalogo). */
export function descrizioneBlocco(mappa, nomeBlocco) {
  return mappa.blocchi[nomeBlocco]?.descrizione ?? ''
}

/** Note di sicurezza delle regioni selezionate (es. cute mediale del braccio non coperta dal plesso). */
export function noteRegioni(mappa, selezione) {
  return selezione.map((id) => mappa.regioni[id]?.note).filter(Boolean)
}

/**
 * Blocco singolo o combinazione minima che copre le regioni scelte, per priorita' clinica.
 * Candidati = solo i blocchi elencati per le regioni scelte (mai blocchi fuori contesto):
 * (1) se un solo blocco copre TUTTE le regioni si propone quello (prima scelta);
 * (2) altrimenti, a ogni passo: blocco con indice clinico migliore, poi quello che copre piu'
 *     regioni residue, poi il piu' specifico (copre meno regioni in totale).
 * L'ordine della selezione influisce sul pool (e quindi sui pareggi), come nel prototipo.
 * @returns {{chosen: {name: string, copre: string[]}[], uncovered: string[]}}
 */
export function suggerisciBlocchi(selezione, mappa) {
  const sel = new Set(selezione)
  const elencoBlocchi = (r) => mappa.regioni[r]?.blocchi ?? []

  const pool = []
  const visti = new Set()
  for (const r of selezione) {
    for (const b of elencoBlocchi(r)) {
      if (mappa.blocchi[b] && !visti.has(b)) {
        visti.add(b)
        pool.push(b)
      }
    }
  }

  const indiceMigliore = (b) => {
    let min = 99
    for (const r of selezione) {
      const i = elencoBlocchi(r).indexOf(b)
      if (i >= 0 && i < min) min = i
    }
    return min
  }
  const copreTraSelezionate = (b) => mappa.blocchi[b].copre.filter((r) => sel.has(r))

  const singoli = pool.filter((b) => selezione.every((r) => mappa.blocchi[b].copre.includes(r)))
  if (singoli.length) {
    singoli.sort((a, b) => indiceMigliore(a) - indiceMigliore(b))
    const b = singoli[0]
    return { chosen: [{ name: b, copre: copreTraSelezionate(b) }], uncovered: [] }
  }

  const residue = new Set(selezione)
  const chosen = []
  while (residue.size) {
    const candidati = pool.filter(
      (b) => !chosen.some((c) => c.name === b) && mappa.blocchi[b].copre.some((r) => residue.has(r)),
    )
    if (!candidati.length) break
    candidati.sort((a, b) => {
      const ia = indiceMigliore(a)
      const ib = indiceMigliore(b)
      if (ia !== ib) return ia - ib
      const ca = mappa.blocchi[a].copre.filter((r) => residue.has(r)).length
      const cb = mappa.blocchi[b].copre.filter((r) => residue.has(r)).length
      if (ca !== cb) return cb - ca
      return mappa.blocchi[a].copre.length - mappa.blocchi[b].copre.length
    })
    const b = candidati[0]
    const coperte = mappa.blocchi[b].copre.filter((r) => residue.has(r))
    chosen.push({ name: b, copre: coperte })
    coperte.forEach((r) => residue.delete(r))
  }
  return { chosen, uncovered: [...residue] }
}
