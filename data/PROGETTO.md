# App per Anestesisti — Documento di progetto

Strumento offline di supporto in sala operatoria e rianimazione: un unico posto per
dosaggi, calcolatori, presidi, parametri e algoritmi, guidato dal profilo del paziente.

> **Ruoli**: il contenuto clinico (cartella `data/`) è curato dal medico; il motore
> dell'app (codice) è realizzato dalla sviluppatrice. Il confine tra i due è netto e
> voluto — vedi "Modello dati".

---

## 1. Principi di sicurezza (non negoziabili)

1. **Ogni valore ha una fonte citata** e una data di revisione (vedi `data/fonti.json`).
   Nessun dosaggio entra senza fonte.
2. **Disclaimer all'apertura** (da accettare la prima volta): *"Strumento di supporto,
   non sostituisce il giudizio clinico. Verificare ogni dose prima della somministrazione."*
3. **La formula è sempre a vista**: l'app mostra il calcolo, non solo il risultato
   (es. `Propofol 2 mg/kg × 70 kg = 140 mg`).
4. **Nessun dato paziente memorizzato**: il profilo vive solo in sessione, non viene
   salvato. Così si resta fuori dal GDPR sui dati sanitari.
5. **Test automatici** su tutti i calcolatori aritmetici: sono la parte a più alto rischio.
6. **Processo di revisione**: un secondo anestesista rilegge i file `data/` prima di ogni
   rilascio; si tiene un changelog con la versione dell'app.

### Nota regolatoria
L'app va impostata come **strumento di riferimento/calcolo con supervisione del clinico**.
Pubblicandola per altri anestesisti, valutare un parere legale/assicurativo se vengono
associati i nomi degli autori. Per evitare il percorso di certificazione come dispositivo
medico (MDR 2017/745), non deve prendere decisioni al posto del medico né somministrare.

---

## 2. Architettura

- **Tipo**: PWA (Progressive Web App) installabile, **100% offline**.
- **Stack consigliato**: React + Vite; `vite-plugin-pwa` per service worker/offline;
  libreria UI (Material UI o shadcn/ui). Nessun server, nessun database, nessun account.
- **Dati locali**: contenuti clinici in file JSON dentro il progetto; preferiti utente in
  `localStorage`.
- **Hosting**: Vercel / Netlify / GitHub Pages (gratuiti, HTTPS incluso).
- **UI in sala**: dark mode, font grande, bottoni ampi (uso con i guanti), max 2 tap per
  arrivare a un dosaggio, ricerca rapida.

### Principi architetturali
- **Un farmaco = una definizione.** Ogni farmaco è definito una sola volta, con le dosi
  legate al **contesto** (adulto / pediatrico / emergenza / neuroassiale) come campi. Gli
  altri moduli lo **richiamano** per id, non lo ricopiano.
- **Motore calcolatori condiviso.** Bolo, γ↔ml/h, diluizione, elastomero, Vt, NPT,
  infusione propofol, correzioni: tutti costruiti su un'unica impalcatura, così aggiungerne
  uno costa poco.
- **Emergenze = algoritmi, non farmaci.** Il Modulo Emergenze contiene i percorsi, che
  puntano ai farmaci già definiti nel Modulo 1.

---

## 3. Profilo paziente (il motore di tutto)

**Input**: sesso, età, peso, altezza.

**Derivati automatici**:
- BMI, BSA
- Peso ideale (IBW), peso magro (LBW), peso corretto — usati come riferimento diverso per
  farmaci diversi
- Categoria (soglie configurabili): neonato (<28 gg) · lattante (<1 anno) · bambino · adulto · **anziano (≥ 65 anni)** — determina presidi, parametri e **fascia di dosaggio**

**Sblocchi**:
- Categoria pediatrica → Modulo 3
- Donna in età fertile → Modulo 4

Ogni modulo legge da questo profilo; cambiando un input si ricalcola tutto.

---

## 4. Modello dati

I contenuti clinici stanno in `data/*.json`, separati dalla logica. Esempio di voce farmaco
con dosi per contesto:

```json
{
  "id": "propofol",
  "nome": "Propofol",
  "classe": "ipnotico",
  "dosi": [
    { "contesto": "induzione_adulto", "valore": 2, "unita": "mg/kg", "peso": "LBW", "min": 1.5, "max": 2.5 },
    { "contesto": "tci_target", "valore": 4, "unita": "mcg/ml", "modello": "Marsh/Schnider", "note": "induzione 4-6, mantenimento 2.5-4" }
  ],
  "fonte": "SIAARTI",
  "revisione": "2026-01"
}
```

Perché così: il medico aggiorna i contenuti senza toccare il codice; gli aggiornamenti sono
tracciabili; il codice resta semplice (legge → calcola → mostra).

### Peso condizionale (scelta automatica dal BMI)
Alcuni farmaci usano un peso di riferimento **diverso in base al BMI del paziente**. Il campo
`peso` può quindi essere una stringa semplice oppure un oggetto condizionale; in quel caso
l'app sceglie da sola e **esplicita sempre il peso usato**.

Esempio — **Propofol**: default **peso reale (TBW)**, ma nell'**obeso (BMI ≥ 30)** usa il
**peso ideale (IBW)**. L'app deve mostrarlo, es.:
`Propofol, paziente obeso — induzione 100–150 mg (IBW)`.

```json
"peso": { "tipo": "condizionale", "default": "reale", "eccezione": { "condizione": "BMI>=30", "usa": "IBW" } }
```

### Fascia d'età (scelta automatica del dosaggio)
Oltre al peso, l'app propone il **dosaggio in base all'età**. Ogni dose può avere una
`fascia_eta`: **`pediatrico` · `adulto` · `anziano`**. L'app seleziona la variante che
corrisponde alla categoria del paziente e la **esplicita** (es. *"dosaggio anziano"*). Se
per quel contesto non esiste una variante dedicata, usa `adulto` e — se presente — applica
`aggiustamento_anziano` (es. `-20..-50%`), mostrando la riduzione.

Esempio — **Propofol induzione**: adulto **1,5–2,5 mg/kg**, anziano **1 mg/kg** (con
oppioide); in TCI, nell'anziano il target si riduce del **20–50%**. Il **pediatrico** è
gestito dalla categoria pediatrica (Modulo 3).

```json
{ "contesto": "induzione", "fascia_eta": "anziano", "valore": 1, "unita": "mg/kg" }
```

### File dei contenuti
```
/data
  fonti.json                → elenco fonti citate (id, titolo, anno)
  farmaci.json              → tutti i farmaci, con dosi per contesto (casa di tutti)
  anestetici-locali.json    → dosi max, onset/durata, tabelle, adiuvanti
  pediatria-presidi.json    → presidi per età/peso, parametri vitali
  ostetricia.json           → parto-analgesia, TC, EPP, eclampsia, neonato
  nutrizione.json           → fabbisogni, refeeding, NPT
  punteggi.json             → scores (via aeree, preop, TI)
  emergenze.json            → algoritmi (richiamano farmaci per id)
  ventilazione.json         → calcolatori + valori limite (quick reference)
```

---

## 5. Catalogo contenuti

### Modulo 1 — Farmaci anestesia *(casa di tutti i farmaci)*
- **Ipnotici**: propofol *(+ target TCI)*, midazolam, ketamina *(→ premed. pediatrica)*, etomidate, dexmedetomidina
- **Oppioidi**: fentanyl *(→ neuroassiale)*, remifentanil *(+ target TCI, modello Minto)*, sufentanil, morfina *(→ neuroassiale)*
- **Curari**: rocuronio, succinilcolina, cisatracurio, atracurio, mivacurio
- **Reversal**: sugammadex (per scenario), neostigmina
- **Antiemetici/PONV**: ondansetron, desametasone *(→ adiuvante blocchi)*, droperidolo
- **Vasoattivi/inotropi (infusione)**: noradrenalina, adrenalina *(→ arresto, anafilassi, neonato)*, dopamina, dobutamina, argipressina, milrinone, isoprenalina
- **Pressori in bolo**: efedrina, fenilefrina *(→ profilassi ipotensione post-spinale)*
- **Antipertensivi crisi**: labetalolo *(valutare urapidil)*
- **Antiaritmici**: amiodarone, lidocaina *(uso antiaritmico; come AL vedi Mod. 2)*, adenosina, magnesio solfato *(→ eclampsia, torsione di punta)*
- **Atropina** *(vagolitico/bradicardia)*
- **Elettroliti/tampone**: calcio cloruro/gluconato, bicarbonato, KCl (velocità max)
- **Antagonisti**: naloxone, flumazenil
- **Dantrolene** *(emergenza — ipertermia maligna)*

**Strumenti (non farmaci)**:
- Calcolatore **dose bolo** (dose × peso, formula a vista). Per i farmaci da induzione mostra l'**intervallo min–max** (es. `Propofol 1,5–2,5 mg/kg × 70 kg = 105–175 mg`), non un valore singolo.
- Calcolatore **γ/kg/min ↔ ml/h** (paziente + diluizione)
- Calcolatore **infusione propofol manuale** (mg/kg/h + peso + concentrazione 1%/2% → ml/h) — trasporto / no TCI
- **Profilassi antibiotica**: dose su peso/BMI + alternative per allergia (molecola, timing, ridose)
- **Schema gestione PM/ICD** in sala operatoria

### Modulo 2 — Anestetici locali
- **Dose max mg/kg**: lidocaina, mepivacaina, bupivacaina, levobupivacaina, ropivacaina (± adrenalina)
- **Tabella onset/durata**
- Calcolatore **mg/kg + peso + concentrazione → volume max ml**
- **Tossicità additiva**: somma delle *percentuali* di dose max quando si mescolano AL
- Calcolatore **diluizione** (fiala → volume/concentrazione finale)
- Calcolatore **elastomero** (fiale + fisiologica per volume totale)
- **Adiuvanti blocchi**: adrenalina, clonidina, desametasone
- **Tabella volumi tipici per blocco** (interscalenico, sovraclaveare, TAP, femorale, popliteo, ESP)
- **Tabella distretto → blocco**
- **Tabella dermatomeri** (T4 capezzolo, T6 xifoide, T10 ombelico…)
- **Tabella sospensione anticoagulanti/antiaggreganti** (blocco neuroassiale)
- **Gestione LAST**: protocollo + Intralipid 20% (bolo + infusione)

### Modulo 3 — Pediatria *(sblocco per età)*
- **Presidi per età/peso**: tubo IOT cuffiato/non (formula) + profondità · lama · LMA · SNG · CVC · catetere vescicale · defibrillazione J/kg
- **Parametri vitali normali** per fascia d'età (FC, PA, FR)
- **Peso stimato per età** (formula APLS) per emergenza a peso ignoto
- **Volemia stimata** (ml/kg) + **massima perdita ematica ammissibile**
- **Fluidi**: mantenimento 4-2-1 · reintegro · glucosata
- **Premedicazione e analgesia** pediatrica (paracetamolo, FANS, oppioidi per kg)
- **Dosaggi farmaci** in contesto pediatrico *(campi del Mod. 1)*

### Modulo 4 — Ostetricia / sala parto *(sblocco per donna in età fertile)*
- **Parto-analgesia**: epidurale e combinata (concentrazioni, bolo iniziale, PCEA/infusione)
- **Anestesia per TC**: spinale (dose), dose test peridurale
- **Dose massima farmaci in peridurale**
- **Oppioidi neuroassiali**: morfina/fentanyl intratecale-peridurale (dose + durata)
- **Profilassi ipotensione post-spinale**: schema infusione fenilefrina
- **Emorragia postpartum**: uterotonici (ossitocina, carbetocina, ergometrina, sulprostone) — dosi e sequenza
- **Preeclampsia/eclampsia**: MgSO₄ carico + mantenimento
- **Rianimazione neonatale**: Apgar + algoritmo + adrenalina neonato

### Modulo 5 — Nutrizione paziente critico
- **Fabbisogno calorico**: 25–30 kcal/kg o Harris-Benedict
- **Proteine**: g/kg per fase/patologia
- **Fabbisogno idrico**, elettroliti di base, micronutrienti/glutammina
- **Sindrome da rialimentazione**: rischio + gestione elettroliti *(in evidenza)*
- Calcolatore **impostazione NPT** (kcal, glucidi, lipidi, aminoacidi, volume)

### Modulo 6 — Calcolatori terapia intensiva
- γ ↔ ml/h · correzione sodio · correzione potassio · anion gap · gap osmolare · osmolarità · deficit idrico · **clearance creatinina** *(unica sede)* · correzione calcio/albumina
- **Formula di Winter** · **QTc** · **A-a gradient** · **MAP / shock index**

### Modulo 7 — Punteggi
**A. Vie aeree / preoperatori**
- **El-Ganzouri (EGRI)**, Mallampati e predittori via aerea difficile
- **STOP-BANG** (OSA)
- **MRC** (scala della dispnea)
- **RCRI (indice di Lee)**, **ARISCAT**, **METs** (capacità funzionale)

**B. Perioperatori / risveglio**
- **Apfel** (PONV), **Aldrete**

**C. Terapia intensiva**
- **GCS**, **RASS**, **CAM-ICU**, **SOFA**, **APACHE II**, **FOUR**, **HACOR**, **ROX**

### Modulo 8 — Emergenze / Algoritmi *(richiamano i farmaci del Mod. 1)*
- **ACLS/ALS** adulto e pediatrico
- **Anafilassi** (adrenalina)
- **LAST** *(condiviso col Mod. 2)*
- **Ipertermia maligna** (dantrolene)
- **Laringospasmo / broncospasmo**
- **Crisi ipertensiva**
- **Protocollo trasfusione massiva**
- **Algoritmo via aerea difficile**

### Modulo 9 — Ventilazione *(riferimento rapido: calcolatori + limiti, NON manuale)*
Assorbe Vt e P/F (prima sparsi nei Mod. 1 e 6). Solo calcolo e semafori sui valori limite;
niente modalità ventilatorie, protocolli o tabelle.
- **Calcolatori**: Vt su peso ideale · compliance statica/dinamica · driving pressure · mechanical power · spazio morto (Vd/Vt) · P/F · indice di ossigenazione · estrazione di ossigeno (O₂ER) · consumo di ossigeno (VO₂) · autonomia bombola O₂
- **Valori limite con flag** (verde/rosso): Vt/kg PBW · Pplateau · driving pressure · PEEP · Ppeak

---

## 6. Fasi di sviluppo

1. **MVP** — Profilo paziente (pesi + categoria) + Modulo 1 (farmaci anestesia) + Modulo 2
   (anestetici locali, incl. LAST). Già utile ogni giorno; valida l'impianto.
2. **Modulo 8 — Emergenze** (alto valore, riusa i farmaci del MVP).
3. **Modulo 3 — Pediatria**.
4. **Modulo 4 — Ostetricia**.
5. **Moduli 5–6 — Nutrizione + calcolatori TI**, **Modulo 7 — Punteggi**, **Modulo 9 — Ventilazione**.
6. Rifinitura: ricerca, preferiti, dark mode, accessibilità con guanti.

---

## 7. Changelog contenuti
| Data | Versione | Note |
|------|----------|------|
| 2026-07-25 | 0.1 | Prima stesura catalogo |
| 2026-07-25 | 0.2 | Aggiunto Modulo 9 Ventilazione; Vt e P/F consolidati lì (rimossi dai Mod. 1 e 6) |
