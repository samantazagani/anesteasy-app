// Elenco dei moduli dell'app, raggruppati come nel menu. Il profilo paziente NON e' un
// modulo della lista: e' sempre visibile nel pannello paziente e guida tutti i moduli.
export const PROFILO = { id: 'profilo', label: 'Profilo paziente' }

export const GRUPPI_MODULI = [
  {
    etichetta: null,
    moduli: [
      { id: 'farmaci', label: 'Farmaci' },
      { id: 'infusione', label: 'γ/ml/h', parole: ['infusione', 'gamma', 'mcg/kg/min'] },
      { id: 'antibiotici', label: 'Antibiotici', parole: ['profilassi'] },
      { id: 'al', label: 'Anestetici locali', parole: ['lidocaina', 'ropivacaina', 'blocchi', 'last'] },
      { id: 'emergenze', label: 'Emergenze', parole: ['als', 'anafilassi', 'arresto'] },
    ],
  },
  {
    etichetta: 'Materno-infantile',
    moduli: [
      { id: 'pediatria', label: 'Pediatria' },
      { id: 'ostetricia', label: 'Ostetricia', parole: ['parto', 'cesareo', 'pph'] },
    ],
  },
  {
    etichetta: 'Terapia intensiva',
    moduli: [
      { id: 'calcolatori-ti', label: 'Calcolatori TI', parole: ['rotem', 'clearance'] },
      { id: 'punteggi', label: 'Punteggi', parole: ['rass', 'rsbi', 'rox'] },
      { id: 'ventilazione', label: 'Ventilazione', parole: ['vt', 'pbw'] },
      { id: 'nutrizione', label: 'Nutrizione', parole: ['enterale', 'parenterale'] },
    ],
  },
]

export const TUTTI_I_MODULI = [PROFILO, ...GRUPPI_MODULI.flatMap((g) => g.moduli)]

export function trovaModulo(id) {
  return TUTTI_I_MODULI.find((m) => m.id === id)
}

/** Moduli il cui nome (o una parola chiave) contiene la ricerca, ignorando maiuscole. */
export function cercaModuli(testo) {
  const q = testo.trim().toLowerCase()
  if (q === '') return []
  return TUTTI_I_MODULI.filter(
    (m) => m.label.toLowerCase().includes(q) || (m.parole ?? []).some((p) => p.includes(q)),
  )
}
