// Motore condiviso per il Modulo 7 (Punteggi), letto da data/punteggi.json. Contiene solo
// i punteggi che il JSON definisce abbastanza per essere calcolati davvero (checklist con
// somma, componenti con selezione, logica booleana, formula diretta). Per i punteggi dove
// il JSON fornisce solo l'elenco delle voci (senza soglie o descrizioni dei livelli), la UI
// mostra un avviso invece di richiamare funzioni qui: non c'e' niente da calcolare in modo
// corretto senza inventare valori non presenti nella fonte.

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

/** Conta quanti elementi di un array di booleani sono true (checklist "1 punto ciascuno"). */
function contaVeri(selezionati, lunghezzaAttesa, nomeFunzione) {
  if (!Array.isArray(selezionati) || selezionati.length !== lunghezzaAttesa) {
    throw new Error(`${nomeFunzione}: servono esattamente ${lunghezzaAttesa} voci`)
  }
  return selezionati.filter(Boolean).length
}

/** STOP-BANG (OSA): 8 voci, 1 punto ciascuna. 0-2 basso, 3-4 intermedio, 5-8 alto rischio. */
export function calcolaStopBang(selezionati) {
  const punteggio = contaVeri(selezionati, 8, 'calcolaStopBang')

  let rischio
  if (punteggio <= 2) rischio = 'basso'
  else if (punteggio <= 4) rischio = 'intermedio'
  else rischio = 'alto'

  return { punteggio, rischio, interpretazione: `${punteggio}/8: rischio OSA ${rischio}` }
}

/**
 * RCRI (indice di Lee): 6 voci, 1 punto ciascuna. Interpretazione da
 * data/punteggi.json: "0:0.4% - 1:0.9% - 2:6.6% - >=3:11%" eventi cardiaci maggiori.
 */
export function calcolaRCRI(selezionati) {
  const punteggio = contaVeri(selezionati, 6, 'calcolaRCRI')

  const mappa = { 0: '0.4%', 1: '0.9%', 2: '6.6%' }
  const percentuale = mappa[punteggio] ?? '11%'

  return { punteggio, percentuale, interpretazione: `${percentuale} di rischio di eventi cardiaci maggiori` }
}

/** Apfel (PONV): 4 voci, 1 punto ciascuna. Rischio PONV ~10/20/40/60/80% per 0-4 fattori. */
export function calcolaApfel(selezionati) {
  const punteggio = contaVeri(selezionati, 4, 'calcolaApfel')

  const mappaPercentuale = { 0: 10, 1: 20, 2: 40, 3: 60, 4: 80 }
  const percentuale = mappaPercentuale[punteggio]

  return { punteggio, percentuale, interpretazione: `~${percentuale}% di rischio di PONV` }
}

/** Glasgow Coma Scale: somma dei 3 componenti selezionati. <=8 = coma. */
export function calcolaGCS({ aperturaOcchi, rispostaVerbale, rispostaMotoria }) {
  if (!(aperturaOcchi >= 1 && aperturaOcchi <= 4)) {
    throw new Error('calcolaGCS: apertura occhi mancante o non valida (1-4)')
  }
  if (!(rispostaVerbale >= 1 && rispostaVerbale <= 5)) {
    throw new Error('calcolaGCS: risposta verbale mancante o non valida (1-5)')
  }
  if (!(rispostaMotoria >= 1 && rispostaMotoria <= 6)) {
    throw new Error('calcolaGCS: risposta motoria mancante o non valida (1-6)')
  }

  const punteggio = aperturaOcchi + rispostaVerbale + rispostaMotoria

  return { punteggio, coma: punteggio <= 8 }
}

/**
 * CAM-ICU (delirium): positivo se criterio 1 (esordio acuto/fluttuante) E criterio 2
 * (inattenzione), PIU' almeno uno tra criterio 3 (alterato livello di coscienza) o
 * criterio 4 (pensiero disorganizzato).
 */
export function calcolaCamIcu({ criterio1, criterio2, criterio3, criterio4 }) {
  const positivo = Boolean(criterio1) && Boolean(criterio2) && (Boolean(criterio3) || Boolean(criterio4))
  return { positivo }
}

/** ROX index: (SpO2 / FiO2) / FR. FiO2 come frazione 0-1. >=4.88 predice successo HFNC. */
export function calcolaROX({ spo2, fiO2, fr }, { decimali = 2 } = {}) {
  if (!(spo2 > 0)) {
    throw new Error('calcolaROX: SpO2 mancante o non valida')
  }
  if (!(fiO2 > 0) || fiO2 > 1) {
    throw new Error('calcolaROX: FiO2 mancante o non valida (frazione 0-1)')
  }
  if (!(fr > 0)) {
    throw new Error('calcolaROX: frequenza respiratoria mancante o non valida')
  }

  const indice = spo2 / fiO2 / fr
  const formula = `(${spo2}/${fiO2}) ÷ ${fr} = ${round(indice, decimali)}`

  return { indice: round(indice, decimali), formula, successoProbabile: indice >= 4.88 }
}

/**
 * Aldrete: 5 voci, punteggio manuale 0-2 ciascuna (il JSON non fornisce le descrizioni dei
 * singoli livelli, solo il range). >=9 dimissibile dalla recovery.
 */
export function calcolaAldrete(punteggiVoci) {
  if (!Array.isArray(punteggiVoci) || punteggiVoci.length !== 5) {
    throw new Error('calcolaAldrete: servono esattamente 5 voci')
  }
  if (punteggiVoci.some((v) => !(v >= 0 && v <= 2))) {
    throw new Error('calcolaAldrete: ogni voce deve essere un punteggio tra 0 e 2')
  }

  const punteggio = punteggiVoci.reduce((somma, v) => somma + v, 0)

  return { punteggio, dimissibile: punteggio >= 9 }
}

/**
 * FOUR score: 4 componenti 0-4 ciascuno, ora con descrizioni complete per opzione nel JSON
 * (in precedenza solo il range, da qui il nome storico "manuale" nella UI che chiamava
 * questa funzione: il calcolo non cambia, cambia solo come l'utente sceglie il punteggio).
 */
export function calcolaFour(punteggiComponenti) {
  if (!Array.isArray(punteggiComponenti) || punteggiComponenti.length !== 4) {
    throw new Error('calcolaFour: servono esattamente 4 componenti')
  }
  if (punteggiComponenti.some((v) => !(v >= 0 && v <= 4))) {
    throw new Error('calcolaFour: ogni componente deve essere un punteggio tra 0 e 4')
  }

  const punteggio = punteggiComponenti.reduce((somma, v) => somma + v, 0)

  return { punteggio }
}

/**
 * El-Ganzouri (EGRI): 7 voci a pesi NON uniformi (0-1 o 0-2 a seconda della voce, non "1
 * punto ciascuna" come STOP-BANG/RCRI/Apfel): ogni voce contribuisce col punteggio (p)
 * dell'opzione scelta dall'utente. >=4 predice intubazione difficile.
 */
export function calcolaElGanzouri(puntiPerVoce) {
  if (!Array.isArray(puntiPerVoce) || puntiPerVoce.length !== 7) {
    throw new Error('calcolaElGanzouri: servono esattamente 7 voci')
  }

  const punteggio = puntiPerVoce.reduce((somma, p) => somma + p, 0)

  return { punteggio, difficileProbabile: punteggio >= 4 }
}

/**
 * ARISCAT (rischio di complicanze polmonari postoperatorie): 7 voci a pesi MOLTO diversi
 * tra loro (es. 0/3/16 sull'eta, 0/8/24 sulla SpO2): a differenza di STOP-BANG/RCRI/Apfel
 * non e' "1 punto per voce", ogni voce va letta dalla sua opzione scelta.
 */
export function calcolaAriscat(puntiPerVoce) {
  if (!Array.isArray(puntiPerVoce) || puntiPerVoce.length !== 7) {
    throw new Error('calcolaAriscat: servono esattamente 7 voci')
  }

  const punteggio = puntiPerVoce.reduce((somma, p) => somma + p, 0)

  let rischio
  if (punteggio < 26) rischio = 'basso'
  else if (punteggio < 45) rischio = 'intermedio'
  else rischio = 'alto'

  return { punteggio, rischio }
}

/** APGAR: 5 voci 0-2 ciascuna. <7 richiede attenzione/eventuale rianimazione. */
export function calcolaApgar(puntiPerVoce) {
  if (!Array.isArray(puntiPerVoce) || puntiPerVoce.length !== 5) {
    throw new Error('calcolaApgar: servono esattamente 5 voci')
  }

  const punteggio = puntiPerVoce.reduce((somma, p) => somma + p, 0)

  return { punteggio, richiedeAttenzione: punteggio < 7 }
}

/**
 * SOFA: 6 componenti 0-4 ciascuno. Il JSON non da' una soglia netta ("la mortalita cresce
 * col punteggio"): si restituisce solo la somma, senza inventare un cutoff.
 */
export function calcolaSofa(puntiPerComponente) {
  if (!Array.isArray(puntiPerComponente) || puntiPerComponente.length !== 6) {
    throw new Error('calcolaSofa: servono esattamente 6 componenti')
  }

  const punteggio = puntiPerComponente.reduce((somma, p) => somma + p, 0)

  return { punteggio }
}

/** HACOR: 5 componenti a pesi non uniformi. >5 (a 1-2h dall'avvio NIV) alto rischio di fallimento. */
export function calcolaHacor(puntiPerComponente) {
  if (!Array.isArray(puntiPerComponente) || puntiPerComponente.length !== 5) {
    throw new Error('calcolaHacor: servono esattamente 5 componenti')
  }

  const punteggio = puntiPerComponente.reduce((somma, p) => somma + p, 0)

  return { punteggio, altoRischio: punteggio > 5 }
}

/**
 * MACOCHA (intubazione difficile in TI): checklist con pesi DIVERSI per voce (Mallampati
 * III/IV vale 5, le altre 1 o 2), non "1 punto ciascuna" come STOP-BANG/RCRI/Apfel: ogni
 * voce selezionata contribuisce col proprio punteggio fisso (data/punteggi.json >
 * macocha.voci[].p), le non selezionate contribuiscono 0. >=3 alto rischio (NPV 97-98%).
 */
export function calcolaMacocha(selezionati, puntiPerVoce) {
  if (!Array.isArray(selezionati) || !Array.isArray(puntiPerVoce) || selezionati.length !== puntiPerVoce.length) {
    throw new Error('calcolaMacocha: selezionati e puntiPerVoce devono avere la stessa lunghezza')
  }

  const punteggio = selezionati.reduce((somma, sel, i) => somma + (sel ? puntiPerVoce[i] : 0), 0)

  return { punteggio, altoRischio: punteggio >= 3 }
}

/**
 * Parkland: fluidi nelle prime 24h dall'ustione = 4 × peso_kg × %TBSA (Ringer lattato).
 * Meta' del volume va data nelle prime 8h DALL'USTIONE (non dall'inizio del calcolo), il
 * resto nelle 16h successive: le due quote si mostrano separate, non solo il totale.
 */
export function calcolaParkland({ pesoKg, percentTBSA }, { decimali = 0 } = {}) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaParkland: peso mancante o non valido')
  }
  if (!(percentTBSA > 0) || percentTBSA > 100) {
    throw new Error('calcolaParkland: %TBSA mancante o non valida (0-100)')
  }

  const totale24h = 4 * pesoKg * percentTBSA
  const prime8h = totale24h / 2
  const successive16h = totale24h / 2
  const formula = `4 × ${pesoKg} kg × ${percentTBSA}% = ${round(totale24h, decimali)} ml/24h`

  return {
    totale24hMl: round(totale24h, decimali),
    prime8hMl: round(prime8h, decimali),
    successive16hMl: round(successive16h, decimali),
    formula,
  }
}
