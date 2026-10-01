// Motore condiviso per il Modulo 6 (Calcolatori TI), letto da data/calcolatori-ti.json.
// "gamma" e "infusione_da_dose_oraria" non hanno funzioni qui: riusano rispettivamente
// calcolaInfusione e calcolaMlOrariDaConcentrazione da infusionCalculator.js, gia'
// esistenti per il Modulo 1 (stessa formula, nessuna duplicazione).

function round(valore, decimali) {
  return Number(valore.toFixed(decimali))
}

function formatNumero(valore, decimali) {
  return String(round(valore, decimali))
}

/** Acqua corporea totale (ACT): peso × 0.6 (uomo) / 0.5 (donna). Condivisa da
 * deficit_sodio e deficit_idrico (data/calcolatori-ti.json). */
export function calcolaACT(pesoKg, sesso) {
  if (!(pesoKg > 0)) {
    throw new Error('calcolaACT: peso mancante o non valido')
  }
  if (sesso !== 'M' && sesso !== 'F') {
    throw new Error('calcolaACT: sesso mancante o non valido (M/F)')
  }
  const fattore = sesso === 'M' ? 0.6 : 0.5
  return { act: pesoKg * fattore, fattore }
}

/** Sodio corretto per glicemia: Na_corretto = Na_misurato + 0.016*(glicemia-100). */
export function calcolaSodioCorretto({ naMisurato, glicemia }, { decimali = 1 } = {}) {
  if (!(naMisurato > 0)) {
    throw new Error('calcolaSodioCorretto: sodio misurato mancante o non valido')
  }
  if (!(glicemia >= 0)) {
    throw new Error('calcolaSodioCorretto: glicemia mancante o non valida')
  }

  const naCorretto = naMisurato + 0.016 * (glicemia - 100)
  const formula = `${formatNumero(naMisurato, decimali)} + 0.016 × (${formatNumero(glicemia, decimali)} - 100) = ${formatNumero(naCorretto, decimali)} mmol/L`

  return { naCorretto: round(naCorretto, decimali), formula }
}

/** Deficit di sodio: deficit_mmol = (Na_target - Na_attuale) × ACT. */
export function calcolaDeficitSodio({ pesoKg, sesso, naAttuale, naTarget }, { decimali = 0 } = {}) {
  if (!(naAttuale > 0) || !(naTarget > 0)) {
    throw new Error('calcolaDeficitSodio: sodio attuale/target mancante o non valido')
  }
  const { act, fattore } = calcolaACT(pesoKg, sesso)

  const deficit = (naTarget - naAttuale) * act
  const formula =
    `(${formatNumero(naTarget, decimali)} - ${formatNumero(naAttuale, decimali)}) × ` +
    `(${formatNumero(pesoKg, decimali)} × ${fattore} = ${formatNumero(act, decimali)} L) = ${formatNumero(deficit, decimali)} mmol`

  return { deficitMmol: round(deficit, decimali), actL: round(act, decimali), formula }
}

/**
 * Deficit di potassio (stima grossolana): ogni 0.1 mmol/L sotto 4.0 ~ 100-200 mmol
 * totali. Se K >= 4.0 non stima un deficit (nessuna correzione indicata da questa
 * formula, che riguarda solo l'ipokaliemia).
 */
export function calcolaDeficitPotassio({ kAttuale }, { decimali = 0 } = {}) {
  if (!(kAttuale >= 0)) {
    throw new Error('calcolaDeficitPotassio: potassio attuale mancante o non valido')
  }

  if (kAttuale >= 4.0) {
    return { steps: 0, deficitMinMmol: 0, deficitMaxMmol: 0, formula: 'K ≥ 4.0 mmol/L: formula non applicabile (nessun deficit stimato).' }
  }

  const steps = round((4.0 - kAttuale) / 0.1, 0)
  const deficitMin = steps * 100
  const deficitMax = steps * 200
  const formula = `(4.0 - ${formatNumero(kAttuale, 1)}) ÷ 0.1 = ${steps} × 100-200 mmol = ${formatNumero(deficitMin, decimali)}-${formatNumero(deficitMax, decimali)} mmol`

  return { steps, deficitMinMmol: round(deficitMin, decimali), deficitMaxMmol: round(deficitMax, decimali), formula }
}

/** Anion gap: AG = Na - (Cl + HCO3); corretto per albumina se fornita. */
export function calcolaAnionGap({ na, cl, hco3, albumina }, { decimali = 1 } = {}) {
  if (!(na > 0) || !(cl > 0) || !(hco3 >= 0)) {
    throw new Error('calcolaAnionGap: Na/Cl/HCO3 mancanti o non validi')
  }

  const ag = na - (cl + hco3)
  const formula = `${formatNumero(na, decimali)} - (${formatNumero(cl, decimali)} + ${formatNumero(hco3, decimali)}) = ${formatNumero(ag, decimali)} mmol/L`

  let agCorretto = null
  let formulaCorretto = null
  if (albumina >= 0) {
    agCorretto = ag + 2.5 * (4.0 - albumina)
    formulaCorretto = `${formatNumero(ag, decimali)} + 2.5 × (4.0 - ${formatNumero(albumina, decimali)}) = ${formatNumero(agCorretto, decimali)} mmol/L`
  }

  return { ag: round(ag, decimali), formula, agCorretto: agCorretto === null ? null : round(agCorretto, decimali), formulaCorretto }
}

/** Gap osmolare: osm_calcolata = 2×Na + glicemia/18 + BUN/2.8; gap = osm_misurata - osm_calcolata. */
export function calcolaGapOsmolare({ na, glicemia, bun, osmMisurata }, { decimali = 1 } = {}) {
  if (!(na > 0) || !(glicemia >= 0) || !(bun >= 0)) {
    throw new Error('calcolaGapOsmolare: Na/glicemia/BUN mancanti o non validi')
  }
  if (!(osmMisurata > 0)) {
    throw new Error('calcolaGapOsmolare: osmolarita misurata mancante o non valida')
  }

  const osmCalcolata = 2 * na + glicemia / 18 + bun / 2.8
  const gap = osmMisurata - osmCalcolata
  const formulaCalcolata = `2 × ${formatNumero(na, decimali)} + ${formatNumero(glicemia, decimali)}/18 + ${formatNumero(bun, decimali)}/2.8 = ${formatNumero(osmCalcolata, decimali)} mOsm/L`
  const formulaGap = `${formatNumero(osmMisurata, decimali)} - ${formatNumero(osmCalcolata, decimali)} = ${formatNumero(gap, decimali)} mOsm/L`

  return { osmCalcolata: round(osmCalcolata, decimali), gap: round(gap, decimali), formulaCalcolata, formulaGap }
}

/** Deficit idrico (ipernatriemia): deficit_L = ACT × ((Na_attuale/140) - 1). */
export function calcolaDeficitIdrico({ pesoKg, sesso, naAttuale }, { decimali = 1 } = {}) {
  if (!(naAttuale > 0)) {
    throw new Error('calcolaDeficitIdrico: sodio attuale mancante o non valido')
  }
  const { act, fattore } = calcolaACT(pesoKg, sesso)

  const deficit = act * (naAttuale / 140 - 1)
  const formula =
    `(${formatNumero(pesoKg, decimali)} × ${fattore} = ${formatNumero(act, decimali)} L) × ` +
    `((${formatNumero(naAttuale, decimali)}/140) - 1) = ${formatNumero(deficit, decimali)} L`

  return { deficitL: round(deficit, decimali), actL: round(act, decimali), formula }
}

/** Clearance creatinina (Cockcroft-Gault): ((140-eta)×peso)/(72×creatinina); ×0.85 se donna. */
export function calcolaClearanceCreatinina({ eta, pesoKg, creatinina, sesso }, { decimali = 1 } = {}) {
  if (!(eta >= 0)) {
    throw new Error('calcolaClearanceCreatinina: eta mancante o non valida')
  }
  if (!(pesoKg > 0)) {
    throw new Error('calcolaClearanceCreatinina: peso mancante o non valido')
  }
  if (!(creatinina > 0)) {
    throw new Error('calcolaClearanceCreatinina: creatinina mancante o non valida')
  }
  if (sesso !== 'M' && sesso !== 'F') {
    throw new Error('calcolaClearanceCreatinina: sesso mancante o non valido (M/F)')
  }

  const base = ((140 - eta) * pesoKg) / (72 * creatinina)
  const clcr = sesso === 'F' ? base * 0.85 : base
  const formula =
    `((140 - ${formatNumero(eta, 0)}) × ${formatNumero(pesoKg, decimali)}) ÷ (72 × ${formatNumero(creatinina, 2)}) = ${formatNumero(base, decimali)} ml/min` +
    (sesso === 'F' ? ` × 0.85 = ${formatNumero(clcr, decimali)} ml/min` : '')

  return { clcrMlMin: round(clcr, decimali), formula }
}

/**
 * eGFR (CKD-EPI 2021, senza fattore razza): a differenza delle altre formule di questo
 * modulo (lineari o con una sola radice), qui servono min/max tra (Scr/k) e 1 elevati a
 * esponenti diversi per uomo/donna — non si presta al pattern "formula lineare + formatNumero"
 * usato sopra, quindi resta una funzione dedicata.
 * eGFR = 142 × min(Scr/k,1)^a × max(Scr/k,1)^-1.200 × 0.9938^eta × (1.012 se donna)
 * k = 0.9 (uomo)/0.7 (donna); a = -0.302 (uomo)/-0.241 (donna).
 * Diversa dalla Cockcroft-Gault (calcolaClearanceCreatinina): CKD-EPI stima la funzione
 * renale generale (ml/min/1.73m²), Cockcroft-Gault resta il riferimento per il dosaggio
 * farmaci (ml/min assoluti, non normalizzati per superficie corporea).
 */
export function calcolaEGFRCKDEPI({ eta, sesso, creatinina }, { decimali = 1 } = {}) {
  if (!(eta >= 0)) {
    throw new Error('calcolaEGFRCKDEPI: eta mancante o non valida')
  }
  if (sesso !== 'M' && sesso !== 'F') {
    throw new Error('calcolaEGFRCKDEPI: sesso mancante o non valido (M/F)')
  }
  if (!(creatinina > 0)) {
    throw new Error('calcolaEGFRCKDEPI: creatinina mancante o non valida')
  }

  const k = sesso === 'F' ? 0.7 : 0.9
  const a = sesso === 'F' ? -0.241 : -0.302
  const rapporto = creatinina / k
  const terminemin = Math.pow(Math.min(rapporto, 1), a)
  const terminemax = Math.pow(Math.max(rapporto, 1), -1.2)
  const fattoreEta = Math.pow(0.9938, eta)

  let egfr = 142 * terminemin * terminemax * fattoreEta
  if (sesso === 'F') egfr *= 1.012

  const formula =
    `142 × min(${formatNumero(creatinina, 2)}/${k}, 1)^${a} × max(${formatNumero(creatinina, 2)}/${k}, 1)^-1.200 × 0.9938^${formatNumero(eta, 0)}` +
    (sesso === 'F' ? ' × 1.012' : '') +
    ` = ${formatNumero(egfr, decimali)} ml/min/1.73m²`

  return { egfrMlMin173: round(egfr, decimali), formula }
}

/** Calcio corretto per albumina: Ca_corretto = Ca_misurato + 0.8×(4.0 - albumina). */
export function calcolaCalcioCorretto({ ca, albumina }, { decimali = 1 } = {}) {
  if (!(ca > 0)) {
    throw new Error('calcolaCalcioCorretto: calcio misurato mancante o non valido')
  }
  if (!(albumina >= 0)) {
    throw new Error('calcolaCalcioCorretto: albumina mancante o non valida')
  }

  const caCorretto = ca + 0.8 * (4.0 - albumina)
  const formula = `${formatNumero(ca, decimali)} + 0.8 × (4.0 - ${formatNumero(albumina, decimali)}) = ${formatNumero(caCorretto, decimali)} mg/dL`

  return { caCorretto: round(caCorretto, decimali), formula }
}

/** Compenso respiratorio atteso (Winter): PaCO2_atteso = 1.5×HCO3 + 8 (± 2). */
export function calcolaWinter({ hco3 }, { decimali = 1 } = {}) {
  if (!(hco3 >= 0)) {
    throw new Error('calcolaWinter: HCO3 mancante o non valido')
  }

  const atteso = 1.5 * hco3 + 8
  const formula = `1.5 × ${formatNumero(hco3, decimali)} + 8 = ${formatNumero(atteso, decimali)} mmHg (± 2)`

  return { attesoMin: round(atteso - 2, decimali), attesoMax: round(atteso + 2, decimali), atteso: round(atteso, decimali), formula }
}

/** QTc (Bazett): RR_s = 60/FC; QTc = QT_ms / sqrt(RR_s). */
export function calcolaQTc({ qtMs, fc }, { decimali = 1 } = {}) {
  if (!(qtMs > 0)) {
    throw new Error('calcolaQTc: QT mancante o non valido')
  }
  if (!(fc > 0)) {
    throw new Error('calcolaQTc: frequenza cardiaca mancante o non valida')
  }

  const rrS = 60 / fc
  const qtc = qtMs / Math.sqrt(rrS)
  const formula = `${formatNumero(qtMs, decimali)} ÷ √(60/${formatNumero(fc, decimali)} = ${formatNumero(rrS, 2)} s) = ${formatNumero(qtc, decimali)} ms`

  return { qtcMs: round(qtc, decimali), formula }
}

/** Gradiente Alveolo-arterioso: A-a = FiO2×(Patm-47) - PaCO2/0.8 - PaO2. */
export function calcolaAaGradient({ fiO2, patm = 760, paCO2, paO2 }, { decimali = 1 } = {}) {
  if (!(fiO2 > 0) || fiO2 > 1) {
    throw new Error('calcolaAaGradient: FiO2 mancante o non valida (frazione 0-1)')
  }
  if (!(patm > 0)) {
    throw new Error('calcolaAaGradient: pressione atmosferica mancante o non valida')
  }
  if (!(paCO2 >= 0) || !(paO2 >= 0)) {
    throw new Error('calcolaAaGradient: PaCO2/PaO2 mancanti o non validi')
  }

  const aa = fiO2 * (patm - 47) - paCO2 / 0.8 - paO2
  const formula = `${formatNumero(fiO2, 2)} × (${formatNumero(patm, 0)} - 47) - ${formatNumero(paCO2, decimali)}/0.8 - ${formatNumero(paO2, decimali)} = ${formatNumero(aa, decimali)} mmHg`

  return { aa: round(aa, decimali), formula }
}

/** Pressione arteriosa media: MAP = (PAS + 2×PAD) / 3. */
export function calcolaMAP({ pas, pad }, { decimali = 1 } = {}) {
  if (!(pas > 0) || !(pad >= 0)) {
    throw new Error('calcolaMAP: PAS/PAD mancanti o non validi')
  }

  const map = (pas + 2 * pad) / 3
  const formula = `(${formatNumero(pas, decimali)} + 2×${formatNumero(pad, decimali)}) ÷ 3 = ${formatNumero(map, decimali)} mmHg`

  return { map: round(map, decimali), formula }
}

/** Shock index: SI = FC / PAS. */
export function calcolaShockIndex({ fc, pas }, { decimali = 2 } = {}) {
  if (!(fc > 0) || !(pas > 0)) {
    throw new Error('calcolaShockIndex: FC/PAS mancanti o non validi')
  }

  const si = fc / pas
  const formula = `${formatNumero(fc, 0)} ÷ ${formatNumero(pas, 0)} = ${formatNumero(si, decimali)}`

  return { si: round(si, decimali), formula }
}

/** Pressione di perfusione cerebrale: CPP = MAP - ICP. */
export function calcolaCPP({ map, icp }, { decimali = 1 } = {}) {
  if (!(map > 0)) {
    throw new Error('calcolaCPP: MAP mancante o non valida')
  }
  if (!(icp >= 0)) {
    throw new Error('calcolaCPP: ICP mancante o non valida')
  }

  const cpp = map - icp
  const formula = `${formatNumero(map, decimali)} - ${formatNumero(icp, decimali)} = ${formatNumero(cpp, decimali)} mmHg`

  return { cpp: round(cpp, decimali), formula }
}

/** Soglia anziano, stessa costante di categoriaEta.js (SOGLIA_ANZIANO = 65). */
const SOGLIA_ANZIANO_ACT = 65

/**
 * Coefficiente ACT per Adrogue-Madias: 3 fasce (non le 2 di calcolaACT sopra), come da
 * data/calcolatori-ti.json > correzione_sodio_adrogue.coeff_ACT — uomo giovane 0.6,
 * donna giovane O uomo anziano 0.5, donna anziana 0.45.
 */
export function coeffACTAdrogue(sesso, eta) {
  if (sesso !== 'M' && sesso !== 'F') {
    throw new Error('coeffACTAdrogue: sesso mancante o non valido (M/F)')
  }
  if (!(eta >= 0)) {
    throw new Error('coeffACTAdrogue: eta mancante o non valida')
  }
  const anziano = eta >= SOGLIA_ANZIANO_ACT
  if (sesso === 'F' && anziano) return { chiave: 'donna_anziana', valore: 0.45 }
  if (sesso === 'M' && !anziano) return { chiave: 'uomo', valore: 0.6 }
  return { chiave: 'donna_o_uomo_anziano', valore: 0.5 }
}

const NA_SOLUZIONI_ADROGUE = { 'ipertonica_3%': 513, 'fisiologica_0.9%': 154 }

/**
 * Correzione Na sicura (Adrogue-Madias): stima la velocita' di infusione per un target
 * di rialzo del sodio in 24h. ATTENZIONE: la formula sottostima il rialzo reale (ignora
 * perdite di acqua libera in corso) — e' solo una stima iniziale, va ricontrollata sul
 * sodio ogni 2-4h (vedi "sicurezza" in data/calcolatori-ti.json e nell'UI).
 */
export function calcolaCorrezioneSodioAdrogue(
  { naPaziente, pesoKg, sesso, eta, soluzione, targetDeltaNa24h },
  { decimali = 1 } = {},
) {
  if (!(naPaziente > 0)) {
    throw new Error('calcolaCorrezioneSodioAdrogue: sodio del paziente mancante o non valido')
  }
  if (!(pesoKg > 0)) {
    throw new Error('calcolaCorrezioneSodioAdrogue: peso mancante o non valido')
  }
  if (!(targetDeltaNa24h > 0)) {
    throw new Error('calcolaCorrezioneSodioAdrogue: target di correzione in 24h mancante o non valido')
  }
  const naSoluzione = NA_SOLUZIONI_ADROGUE[soluzione]
  if (!(naSoluzione > 0)) {
    throw new Error('calcolaCorrezioneSodioAdrogue: soluzione non riconosciuta')
  }

  const { chiave: coeffChiave, valore: coeff } = coeffACTAdrogue(sesso, eta)
  const act = pesoKg * coeff
  const deltaNaPerLitro = (naSoluzione - naPaziente) / (act + 1)
  if (deltaNaPerLitro === 0) {
    throw new Error(
      'calcolaCorrezioneSodioAdrogue: la soluzione scelta ha lo stesso Na del paziente, nessuna correzione stimabile',
    )
  }
  const volumeL24h = targetDeltaNa24h / deltaNaPerLitro
  const volumeMl24h = volumeL24h * 1000
  const velocitaMlH = volumeMl24h / 24

  const formula =
    `ACT = ${formatNumero(pesoKg, decimali)} × ${coeff} = ${formatNumero(act, decimali)} L; ` +
    `ΔNa/L = (${naSoluzione} - ${formatNumero(naPaziente, decimali)}) ÷ (${formatNumero(act, decimali)} + 1) = ${formatNumero(deltaNaPerLitro, 2)} mEq/L; ` +
    `${formatNumero(targetDeltaNa24h, decimali)} ÷ ${formatNumero(deltaNaPerLitro, 2)} = ${formatNumero(volumeL24h, 2)} L/24h = ${formatNumero(velocitaMlH, decimali)} ml/h`

  return {
    coeffChiave,
    coeff,
    actL: round(act, decimali),
    deltaNaPerLitro: round(deltaNaPerLitro, 2),
    volumeL24h: round(volumeL24h, 2),
    volumeMl24h: round(volumeMl24h, 0),
    velocitaMlH: round(velocitaMlH, decimali),
    superaLimiteAssoluto: targetDeltaNa24h > 8,
    superaLimiteAltoRischio: targetDeltaNa24h > 6,
    formula,
  }
}

/**
 * PIA (pressione intra-addominale): conversione cmH2O <-> mmHg + fascia clinica di
 * riferimento (sempre calcolata in mmHg, standard clinico per la PIA).
 * Normale 5-7 mmHg; ipertensione intra-addominale >12; sindrome compartimentale >20.
 */
export function calcolaPIAConversione({ valore, unitaDiPartenza }, { decimali = 1 } = {}) {
  if (!(valore >= 0)) {
    throw new Error('calcolaPIAConversione: valore mancante o non valido')
  }
  if (unitaDiPartenza !== 'cmH2O' && unitaDiPartenza !== 'mmHg') {
    throw new Error('calcolaPIAConversione: unita di partenza non valida (cmH2O o mmHg)')
  }

  const daCmH2O = unitaDiPartenza === 'cmH2O'
  const convertito = daCmH2O ? valore / 1.36 : valore * 1.36
  const unitaConvertita = daCmH2O ? 'mmHg' : 'cmH2O'
  const valoreMmHg = daCmH2O ? convertito : valore
  const formula = daCmH2O
    ? `${formatNumero(valore, decimali)} ÷ 1.36 = ${formatNumero(convertito, decimali)} mmHg`
    : `${formatNumero(valore, decimali)} × 1.36 = ${formatNumero(convertito, decimali)} cmH2O`

  let livello = 'normale'
  if (valoreMmHg > 20) livello = 'sindrome_compartimentale'
  else if (valoreMmHg > 12) livello = 'ipertensione_intra_addominale'
  else if (valoreMmHg > 7) livello = 'elevato'

  return {
    convertito: round(convertito, decimali),
    unitaConvertita,
    valoreMmHg: round(valoreMmHg, decimali),
    livello,
    formula,
  }
}

const FATTORE_MCG = { mg: 1000, mcg: 1 }

function doseInMcgMin(valore, unita) {
  const [massa, tempo] = unita.split('/')
  const mcg = valore * FATTORE_MCG[massa]
  return tempo === 'h' ? mcg / 60 : mcg
}

/**
 * ml/h da dose (data/calcolatori-ti.json > infusione_da_dose_oraria, potenziato): a
 * differenza di calcolaMlOrariDaConcentrazione (infusionCalculator.js, ancora usato dal
 * Modulo 1 "Dose oraria -> ml/h", mg impliciti su mg/h), qui concentrazione e dose hanno
 * unita di massa selezionabili (mg o mcg) indipendenti, la dose puo' essere per minuto o per
 * ora, ed e' BIDIREZIONALE: passare esattamente uno tra {doseValore,doseUnita} e mlH, l'altro
 * si ricava. Restituisce sempre tutte le equivalenze (ml/h, mg/min, mcg/min, mg/h, mcg/h) a
 * vista, non solo il risultato nella singola unita' scelta.
 *
 * @param {{ quantitaFarmaco: number, quantitaUnita: 'mg'|'mcg', volumeTotaleMl: number, doseValore?: number, doseUnita?: 'mg/h'|'mg/min'|'mcg/h'|'mcg/min', mlH?: number }} input
 */
export function calcolaInfusioneDoseUnita(
  { quantitaFarmaco, quantitaUnita, volumeTotaleMl, doseValore, doseUnita, mlH },
  { decimali = 2 } = {},
) {
  if (!(quantitaFarmaco > 0)) {
    throw new Error('calcolaInfusioneDoseUnita: quantita di farmaco mancante o non valida')
  }
  if (!(volumeTotaleMl > 0)) {
    throw new Error('calcolaInfusioneDoseUnita: volume totale mancante o non valido')
  }

  const concMcgMl = (quantitaFarmaco * FATTORE_MCG[quantitaUnita]) / volumeTotaleMl

  const haDose = doseValore !== undefined && doseValore !== null && doseValore !== ''
  const haMlH = mlH !== undefined && mlH !== null && mlH !== ''
  if (haDose === haMlH) {
    throw new Error('calcolaInfusioneDoseUnita: specificare esattamente uno tra dose e ml/h')
  }

  let mcgMin
  let mlHCalcolato
  let formula
  if (haDose) {
    if (!(doseValore > 0)) {
      throw new Error('calcolaInfusioneDoseUnita: dose mancante o non valida')
    }
    mcgMin = doseInMcgMin(doseValore, doseUnita)
    mlHCalcolato = (mcgMin / concMcgMl) * 60
    formula =
      `${formatNumero(quantitaFarmaco, 2)} ${quantitaUnita} ÷ ${formatNumero(volumeTotaleMl, 0)} ml = ${formatNumero(concMcgMl, 1)} mcg/ml; ` +
      `${formatNumero(doseValore, 2)} ${doseUnita} = ${formatNumero(mcgMin, 1)} mcg/min ÷ conc. × 60 = ${formatNumero(mlHCalcolato, decimali)} ml/h`
  } else {
    if (!(mlH > 0)) {
      throw new Error('calcolaInfusioneDoseUnita: ml/h mancante o non valido')
    }
    mlHCalcolato = mlH
    mcgMin = (mlH / 60) * concMcgMl
    formula = `${formatNumero(mlH, decimali)} ml/h × ${formatNumero(concMcgMl, 1)} mcg/ml ÷ 60 = ${formatNumero(mcgMin, 1)} mcg/min`
  }

  return {
    concMcgMl: round(concMcgMl, 2),
    concMgMl: round(concMcgMl / 1000, 3),
    equivalenze: {
      mlH: round(mlHCalcolato, decimali),
      mgMin: round(mcgMin / 1000, 4),
      mcgMin: round(mcgMin, 1),
      mgH: round((mcgMin * 60) / 1000, 3),
      mcgH: round(mcgMin * 60, 0),
    },
    formula,
  }
}
