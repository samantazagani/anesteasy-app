# Changelog dati — app anestesia

Manifest delle modifiche ai file in `data/` e `data-nuovi/`, per guidare l'integrazione nell'app.
Legenda azione: **DATI** = basta rileggere il JSON · **APP** = serve modifica nel codice (campo/vista nuovi).

Convenzione: ogni voce riporta data, file, cosa è cambiato e l'azione richiesta. Le più recenti in alto.

---

## 2026-09-30

- **data-nuovi/calcolatori-ti.json** — Calcolatore **`infusione_da_dose_oraria`** potenziato: unità di massa selezionabili (**mg/mcg**) per concentrazione e dose, dose in **mg/h / mg/min / mcg/h / mcg/min**, conversione **bidirezionale** dose ⇄ ml/h e riga equivalenze (ml/h · mg/min · mcg/min · mg/h · mcg/h). `input` ora è strutturato con `unita` (array = selettore). Vedi mockup `mockup-infusione.html`.
  → **APP**: rendere i selettori di unità + il calcolo bidirezionale (campo guida = ultimo modificato). Resta NON per kg (i γ sono nel calcolatore `gamma`).

## 2026-09-29

- **data-nuovi/calcolatori-ti.json** — Nuovo calcolatore **`rotem`** (categoria `coagulazione`, `tipo: "interprete"`): interpretazione ROTEM del paziente sanguinante. Contiene `input`, `regole` (soglia → interpretazione → azione → dose sul peso, in sequenza lisi→fibrinogeno→piastrine→fattori→eparina) e `riferimenti` (parametri, test, valori normali) per la scheda statica. Soglie A5-guidate (Görlinger) con `fonte` + `data_revisione`.
  → **APP**: modalità interattiva (inserisci i valori → azioni + dose sul peso, aggancia `paziente.json`) + tab riferimenti statici. Vedi mockup `mockup-rotem.html`. `tipo: "interprete"` è un rendering nuovo rispetto agli altri calcolatori (formula singola).

- **data/farmaci.json** — Sugammadex arricchito: dosi per grado di blocco (2 mg/kg TOF≥2 / 4 mg/kg PTC 1-2 / 16 mg/kg RSI) con descrizioni TOF/PTC precise + nuovo campo **`avvertenze`** (solo aminosteroidei, peso reale, ri-curarizzazione, interazione contraccettivi, bradicardia/anafilassi).
  → **APP**: renderizzare `avvertenze` (array di stringhe) in modo **discreto e non invasivo** — un piccolo triangolino ⚠️ a lato del farmaco, visibile solo se il campo esiste; al tap/click espande le avvertenze in punti brevi (popover/accordion). L'elenco dosi resta la vista primaria per il confronto rapido. Se non gestito, le dosi restano comunque visibili.
  → **Convenzione DATI**: le voci `avvertenze` vanno tenute telegrafiche (poche parole, punti chiave), non frasi lunghe.

- **data-nuovi/paziente.json** *(nuovo file)* — Modello **paziente condiviso** (punti 6 e 7): input unici (sesso/età/peso/altezza), pesi derivati (BMI, IBW-Devine, PBW, ABW) con formule, e mappa `peso_per_modulo` (quale peso usa ciascun modulo).
  → **APP**: (6) profilo paziente inserito una volta che pre-compila gli input di tutti i calcolatori; (7) mostrare in ogni calcolo quale peso è usato + i kg calcolati.

- **data-nuovi/anestetici-locali.json** — Nuovo `blocchi_catalogo` (copertura + descrizione di ogni blocco + `logica_combinazione`); nomi blocchi normalizzati; nota sulla cute mediale del braccio (intercostobrachiale T2); `avambraccio` con Ascellare come prima scelta; guaina del retto limitata alla parete addominale.
  → **DATI** per l'elenco blocchi. → **APP** (omino): motore di combinazione a priorità clinica (prossimale+distale), vedi `omino-blocchi.html` v7.

- **omino-blocchi.html** (artifact v7) — Motore di copertura: ogni blocco mostra cosa copre; selezione multipla → combinazione clinica (es. femore→Femorale; spalla+braccio+avambraccio+mano→Interscalenico+Ascellare); avviso cute mediale del braccio.

---

## Da fare / proposte aperte

- (proposta) Rendering **data-driven** generico: l'app disegna ciò che è nel JSON così aggiungere una voce = compare senza ricodifica.
- (proposta, in sospeso) Crisis cards emergenze: solo se data-driven con campi `linee_guida` + `data_revisione` per aggiornarle facilmente.
