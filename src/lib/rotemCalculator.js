// Motore per l'interprete ROTEM (Modulo 6), letto da data/calcolatori-ti.json > rotem.
// A differenza degli altri calcolatori di questo modulo (formula singola), rotem.tipo e'
// "interprete": una sequenza di 5 regole soglia -> interpretazione -> azione -> dose sul
// peso (dove prevista). Le soglie numeriche sono hardcodate qui rispecchiando ESATTAMENTE
// rotem.regole del JSON (stesso principio di calcolatoriTI.js: i valori clinici restano nel
// JSON/mostrati in UI, la logica di valutazione vive in funzioni dedicate, non in un motore
// generico che interpreta le stringhe "condizione" - piu' fragile e comunque da hardcodare
// per i valori veri).
//
// Nota clinica da rispettare ovunque un risultato di questo file venga mostrato: leggere
// FIBTEM A5 PRIMA di interpretare EXTEM CT - il CT e' interpretabile solo se il fibrinogeno
// e' adeguato (vedi rotem.nota_sequenza). Le regole "piastrine" e "fattori" qui sotto
// incorporano questo controllo direttamente nel risultato (rimandato / interpretazioneAffidabile).

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

function formatNumero(valore, decimali) {
  return String(round(valore, decimali))
}

// "valore >= 0" sembrerebbe un controllo ragionevole per "il campo e' stato inserito", ma
// null >= 0 e' true in JS (null si converte a 0): un campo vuoto passerebbe il guard e
// verrebbe trattato come zero invece che come "non valutato". Controllo esplicito sul tipo.
function numeroValido(valore) {
  return typeof valore === 'number' && Number.isFinite(valore)
}

function doseSulPeso(min, max, pesoKg, unita, decimali = 0) {
  if (!(pesoKg > 0)) return null
  const minMg = min * pesoKg
  const maxMg = max != null ? max * pesoKg : null
  const formula =
    maxMg !== null
      ? `${min}-${max} ${unita}/kg × ${formatNumero(pesoKg, 1)} kg = ${formatNumero(minMg, decimali)}-${formatNumero(maxMg, decimali)} ${unita}`
      : `${min} ${unita}/kg × ${formatNumero(pesoKg, 1)} kg = ${formatNumero(minMg, decimali)} ${unita}`
  return { minMg: round(minMg, decimali), maxMg: maxMg === null ? null : round(maxMg, decimali), formula }
}

/** Step 1 - Iperfibrinolisi: EXTEM ML > 15% -> acido tranexamico (15-20 mg/kg, o 1 g fisso). */
export function valutaFibrinolisi({ extemMl, pesoKg }) {
  if (!numeroValido(extemMl)) return { valutato: false }
  if (!(extemMl > 15)) return { valutato: true, attivo: false }

  return {
    valutato: true,
    attivo: true,
    interpretazione: 'Iperfibrinolisi (confermare con APTEM)',
    azione: 'Acido tranexamico',
    dose: doseSulPeso(15, 20, pesoKg, 'mg'),
    doseFissa: '1 g',
  }
}

/** Step 2 - Fibrinogeno basso: FIBTEM A5 < 10 mm -> fibrinogeno concentrato (25-50 mg/kg).
 * Soglia piu' alta (<12) in ostetricia/cardiochirurgia, per nota_condizione del JSON: non
 * applicata di default qui (serve il contesto clinico), segnalata come avviso nel risultato. */
export function valutaFibrinogeno({ fibtemA5, pesoKg }) {
  if (!numeroValido(fibtemA5)) return { valutato: false }
  const attivo = fibtemA5 < 10
  const zonaGrigiaOstetricaCardiochirurgia = !attivo && fibtemA5 < 12

  if (!attivo) {
    return { valutato: true, attivo: false, zonaGrigiaOstetricaCardiochirurgia }
  }

  return {
    valutato: true,
    attivo: true,
    interpretazione: 'Deficit di fibrinogeno',
    azione: 'Fibrinogeno concentrato (o crioprecipitato)',
    dose: doseSulPeso(25, 50, pesoKg, 'mg'),
  }
}

/** Step 3 - Piastrine: EXTEM A5 < 35 mm CON fibrinogeno adeguato (FIBTEM A5 >= 10). Se il
 * fibrinogeno e' ancora basso, il JSON dice di correggerlo PRIMA e rivalutare le piastrine. */
export function valutaPiastrine({ extemA5, fibtemA5 }) {
  if (!numeroValido(extemA5)) return { valutato: false }
  if (!(extemA5 < 35)) return { valutato: true, attivo: false }

  if (fibtemA5 < 10) {
    return {
      valutato: true,
      attivo: false,
      rimandato: true,
      interpretazione: 'EXTEM A5 basso ma fibrinogeno ancora inadeguato (FIBTEM A5 <10): correggere prima il fibrinogeno e rivalutare',
    }
  }

  return {
    valutato: true,
    attivo: true,
    interpretazione: 'Deficit piastrinico (con fibrinogeno adeguato)',
    azione: 'Piastrine (1 pool)',
    dose: null,
  }
}

/** Step 4 - Fattori: EXTEM CT > 80 s -> PCC (25 UI/kg) o plasma. Interpretabile in modo
 * affidabile solo se il fibrinogeno e' gia' adeguato (nota_sequenza del JSON): se non lo e',
 * il risultato resta "attivo" (il CT e' comunque prolungato) ma interpretazioneAffidabile
 * e' false, cosi' la UI puo' mostrare l'avviso prima di agire. */
export function valutaFattori({ extemCt, fibtemA5, pesoKg }) {
  if (!numeroValido(extemCt)) return { valutato: false }
  if (!(extemCt > 80)) return { valutato: true, attivo: false }

  const fibrinogenoAdeguato = !(fibtemA5 < 10)

  return {
    valutato: true,
    attivo: true,
    interpretazioneAffidabile: fibrinogenoAdeguato,
    interpretazione: 'Deficit di fattori della coagulazione',
    azione: 'PCC (o plasma)',
    dose: doseSulPeso(25, null, pesoKg, 'UI'),
  }
}

/** Step 5 - Eparina residua: INTEM CT > 240 s E (INTEM CT / HEPTEM CT) > 1.25 -> protamina. */
export function valutaEparina({ intemCt, heptemCt }, { decimali = 2 } = {}) {
  if (!numeroValido(intemCt) || !(heptemCt > 0)) return { valutato: false }

  const rapporto = round(intemCt / heptemCt, decimali)
  if (!(intemCt > 240 && rapporto > 1.25)) {
    return { valutato: true, attivo: false, rapporto }
  }

  return {
    valutato: true,
    attivo: true,
    interpretazione: 'Effetto eparinico residuo (HEPTEM corregge INTEM)',
    azione: 'Protamina (secondo eparina residua)',
    rapporto,
  }
}

/**
 * Valuta le 5 regole nella sequenza clinica del JSON (lisi -> fibrinogeno -> piastrine ->
 * fattori -> eparina) e restituisce un risultato per step, sempre nello stesso ordine
 * (indipendente da quali siano "attivi": un paziente puo' avere piu' problemi insieme).
 */
export function valutaSequenzaRotem({ pesoKg, extemMl, fibtemA5, extemA5, extemCt, intemCt, heptemCt }) {
  return [
    { step: 1, nome: 'Fibrinolisi', colore: 'lisi', ...valutaFibrinolisi({ extemMl, pesoKg }) },
    { step: 2, nome: 'Fibrinogeno', colore: 'fibrinogeno', ...valutaFibrinogeno({ fibtemA5, pesoKg }) },
    { step: 3, nome: 'Piastrine', colore: 'piastrine', ...valutaPiastrine({ extemA5, fibtemA5 }) },
    { step: 4, nome: 'Fattori', colore: 'fattori', ...valutaFattori({ extemCt, fibtemA5, pesoKg }) },
    { step: 5, nome: 'Eparina', colore: 'eparina', ...valutaEparina({ intemCt, heptemCt }) },
  ]
}
