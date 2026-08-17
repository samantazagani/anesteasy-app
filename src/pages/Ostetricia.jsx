import ostetriciaData from '../../data/ostetricia.json'
import farmaciData from '../../data/farmaci.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaDose, formatoRisultato } from '../lib/doseCalculator'
import { BadgeVerifica } from '../components/BadgeVerifica.jsx'
import '../styles/risultato.css'
import './Ostetricia.css'

const SOGLIA_ETA_FERTILE_MIN = 12
const SOGLIA_ETA_FERTILE_MAX = 50

function intervallo(valori, unita) {
  const [min, max] = valori
  return `${min}-${max}${unita ? ` ${unita}` : ''}`
}

function etaFertileEuristica(sesso, eta) {
  return sesso === 'F' && eta !== null && eta !== undefined && eta >= SOGLIA_ETA_FERTILE_MIN && eta <= SOGLIA_ETA_FERTILE_MAX
}

export function Ostetricia() {
  const { profile } = usePatientProfile()
  const attivo = etaFertileEuristica(profile.sesso, profile.eta)

  if (!attivo) {
    return (
      <section id="ostetricia">
        <h1>Ostetricia</h1>
        <p className="avviso">
          Questo modulo si attiva per un profilo sesso F, età {SOGLIA_ETA_FERTILE_MIN}-
          {SOGLIA_ETA_FERTILE_MAX} anni: un'euristica per "età fertile" usata solo per
          proporre il modulo al momento giusto, non un dato clinico o una diagnosi.
          Imposta sesso ed età nella scheda "Profilo paziente" per usarlo.
        </p>
      </section>
    )
  }

  const adrenalinaNeonato = farmaciData.farmaci
    .find((f) => f.id === 'adrenalina')
    ?.dosi.find((d) => d.contesto === 'neonato')

  return (
    <section id="ostetricia">
      <h1>Ostetricia</h1>
      <p className="nota">
        Modulo attivo per euristica "età fertile" (sesso F, {SOGLIA_ETA_FERTILE_MIN}-
        {SOGLIA_ETA_FERTILE_MAX} anni): un promemoria, non una diagnosi.
      </p>

      <SezioneParotoAnalgesia dati={ostetriciaData.parto_analgesia} />
      <SezioneTaglioCesareo taglioCesareo={ostetriciaData.taglio_cesareo} doseMaxPeridurale={ostetriciaData.dose_max_peridurale} />
      <SezioneOppioidiNeuroassiali lista={ostetriciaData.oppioidi_neuroassiali} />
      <SezioneIpotensione dati={ostetriciaData.profilassi_ipotensione_post_spinale} />
      <SezioneDiagnosiPPH dati={ostetriciaData.diagnosi_pph} />
      <SezioneBundlePrimaRisposta dati={ostetriciaData.emorragia_postpartum.bundle_prima_risposta} />
      <SezioneOssitocinaTXA
        ossitocina={ostetriciaData.emorragia_postpartum.ossitocina}
        acidoTranexamico={ostetriciaData.emorragia_postpartum.acido_tranexamico}
        secondaLinea={ostetriciaData.emorragia_postpartum.seconda_linea_uterotonici}
        fluidi={ostetriciaData.emorragia_postpartum.fluidi}
      />
      <SezionePrevenzioneTerzoStadio dati={ostetriciaData.prevenzione_terzo_stadio} />
      <SezionePPHRefrattaria dati={ostetriciaData.pph_refrattaria} />
      <SezioneTrasfusioneMassiva dati={ostetriciaData.trasfusione_massiva} />
      <SezioneCalcolatorePesoPPH dati={ostetriciaData.calcolatore_peso_pph} pesoKg={profile.pesoKg} />
      <SezionePreeclampsia dati={ostetriciaData.preeclampsia_eclampsia} />
      <SezioneRianimazioneNeonatale dati={ostetriciaData.rianimazione_neonatale} adrenalina={adrenalinaNeonato} />
    </section>
  )
}

function SezioneParotoAnalgesia({ dati }) {
  const { epidurale, combinata_spinale_epidurale: combinata } = dati

  return (
    <div className="riquadro-ostetricia">
      <h2>Parto-analgesia</h2>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Epidurale</p>
          <BadgeVerifica verificato={epidurale.verificato} />
        </div>
        <p className="nota">Soluzione: {epidurale.soluzione}</p>
        <p className="nota">Oppioide: {epidurale.oppioide}</p>
        <p className="nota">Bolo iniziale: {intervallo(epidurale.bolo_iniziale_ml, 'ml')}</p>
        <p className="nota">
          PCEA: bolo {epidurale.pcea.bolo_ml} ml · lockout {intervallo(epidurale.pcea.lockout_min, 'min')} ·
          infusione basale {intervallo(epidurale.pcea.infusione_basale_ml_h, 'ml/h')}
        </p>
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Combinata spinale-epidurale</p>
          <BadgeVerifica verificato={combinata.verificato} />
        </div>
        <p className="nota">Componente spinale: {combinata.componente_spinale}</p>
      </div>
    </div>
  )
}

function SezioneTaglioCesareo({ taglioCesareo, doseMaxPeridurale }) {
  const { spinale, dose_test_peridurale: doseTest } = taglioCesareo

  return (
    <div className="riquadro-ostetricia">
      <h2>Taglio cesareo</h2>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Spinale</p>
          <BadgeVerifica verificato={spinale.verificato} />
        </div>
        <p className="nota">Farmaco: {spinale.farmaco}</p>
        <p className="nota">Dose: {intervallo(spinale.dose_mg, 'mg')}</p>
        <p className="nota">Oppioidi: {spinale.oppioidi}</p>
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Dose test peridurale</p>
          <BadgeVerifica verificato={doseTest.verificato} />
        </div>
        <p className="nota">{doseTest.soluzione}</p>
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Dose massima peridurale</p>
          <BadgeVerifica verificato={doseMaxPeridurale.verificato} />
        </div>
        <p className="nota">{doseMaxPeridurale.nota}</p>
      </div>
    </div>
  )
}

function SezioneOppioidiNeuroassiali({ lista }) {
  return (
    <div className="riquadro-ostetricia">
      <h2>Oppioidi neuroassiali</h2>
      <div className="lista-voci-ostetricia">
        {lista.map((dose, i) => {
          const risultato = calcolaDose(dose)
          return (
            <div key={`${dose.farmaco}-${dose.via}-${i}`} className="voce-ostetricia">
              <div className="riga-meta">
                <span className="chip chip-capitalizza">{dose.farmaco}</span>
                <span className="chip chip-capitalizza">Via: {dose.via}</span>
                <BadgeVerifica verificato={dose.verificato} />
              </div>
              <p className="risultato-primario">{formatoRisultato(risultato)}</p>
              <p className="formula">{risultato.formula}</p>
              {dose.durata_h && <p className="nota">Durata: {intervallo(dose.durata_h, 'h')}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SezioneIpotensione({ dati }) {
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Profilassi ipotensione post-spinale</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      <p className="nota">Farmaco: {dati.farmaco}</p>
      <p className="nota">Schema: {dati.schema}</p>
    </div>
  )
}

function SezioneDiagnosiPPH({ dati }) {
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Emorragia postpartum · Diagnosi</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      <p className="nota">{dati.criteri}</p>
      <p className="scheda-titolo">Segni emodinamici (riferimento)</p>
      <ul className="lista-riferimento">
        {dati.segni_emodinamici.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="avviso">{dati.nota}</p>
    </div>
  )
}

function SezioneBundlePrimaRisposta({ dati }) {
  return (
    <div className="riquadro-ostetricia riquadro-urgente">
      <div className="riga-meta">
        <span className="badge-emergenza">URGENTE · ENTRO {dati.entro_minuti} MIN</span>
        <h2>Bundle prima risposta</h2>
      </div>
      <p className="avviso avviso-errore">
        I componenti vanno eseguiti SIMULTANEAMENTE, non uno dopo l'altro: non sono passi in
        sequenza, sono azioni in parallelo entro i primi {dati.entro_minuti} minuti.
      </p>
      <ul className="lista-riferimento lista-bundle">
        {dati.componenti.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  )
}

function SezioneOssitocinaTXA({ ossitocina, acidoTranexamico, secondaLinea, fluidi }) {
  return (
    <div className="riquadro-ostetricia">
      <h2>Ossitocina e acido tranexamico</h2>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Ossitocina</p>
          <BadgeVerifica verificato={ossitocina.verificato} />
        </div>
        <p className="nota">Iniziale: {ossitocina.iniziale}</p>
        <p className="nota">Mantenimento: {ossitocina.mantenimento}</p>
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Acido tranexamico</p>
          <BadgeVerifica verificato={acidoTranexamico.verificato} />
        </div>
        <p className="avviso avviso-errore">⚠ Sicurezza: {acidoTranexamico.sicurezza}</p>
        <p className="nota">Prima dose: {acidoTranexamico.prima_dose}</p>
        <p className="nota">Seconda dose: {acidoTranexamico.seconda_dose}</p>
        <p className="nota">Finestra: {acidoTranexamico.finestra}</p>
        <p className="nota">Controindicazione: {acidoTranexamico.controindicazione}</p>
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Seconda linea uterotonici</p>
          <BadgeVerifica verificato={secondaLinea.verificato} />
        </div>
        <p className="nota">{secondaLinea.indicazione}</p>
        <ul className="lista-riferimento">
          {secondaLinea.opzioni.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        {secondaLinea.note.map((n) => (
          <p key={n} className="avviso">
            {n}
          </p>
        ))}
      </div>

      <div className="scheda">
        <div className="riga-meta">
          <p className="scheda-titolo">Fluidi</p>
          <BadgeVerifica verificato={fluidi.verificato} />
        </div>
        <p className="nota">{fluidi.scelta}</p>
        <p className="avviso">{fluidi.attenzione}</p>
      </div>
    </div>
  )
}

function SezionePrevenzioneTerzoStadio({ dati }) {
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Prevenzione terzo stadio</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      <p className="nota">{dati.principio}</p>

      <div className="tabella-scroll">
        <table className="tabella-uterotonici">
          <thead>
            <tr>
              <th>Farmaco</th>
              <th>Dose</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {dati.uterotonici.map((u) => (
              <tr key={u.farmaco} className={u.prima_scelta ? 'riga-prima-scelta' : undefined}>
                <td className="chip-capitalizza">
                  {u.farmaco}
                  {u.prima_scelta && <span className="chip chip-accento">prima scelta</span>}
                </td>
                <td>{u.dose}</td>
                <td>{u.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="avviso avviso-errore">
        NON raccomandati in profilassi:
        <ul className="lista-riferimento">
          {dati.NON_raccomandati_in_profilassi.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SezionePPHRefrattaria({ dati }) {
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>PPH refrattaria</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>

      <p className="scheda-titolo">Misure temporizzanti (riferimento)</p>
      <ul className="lista-riferimento">
        {dati.misure_temporizzanti.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="avviso avviso-errore">NON raccomandato: {dati.NON_raccomandato}</p>

      <p className="scheda-titolo">Interventi definitivi (sequenziale)</p>
      <ol className="lista-riferimento">
        {dati.interventi_definitivi.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
    </div>
  )
}

function SezioneTrasfusioneMassiva({ dati }) {
  const targetRighe = Object.entries(dati.target)

  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Trasfusione massiva</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      <p className="nota">{dati.definizione}</p>

      <p className="scheda-titolo">Target di laboratorio</p>
      <div className="tabella-scroll">
        <table className="tabella-target-trasfusione">
          <tbody>
            {targetRighe.map(([parametro, valore]) => (
              <tr key={parametro}>
                <td>{parametro}</td>
                <td>{valore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="nota">GRC: {dati.GRC}</p>
      <p className="nota">PFC: {dati.PFC}</p>
      <p className="nota">Fibrinogeno: {dati.fibrinogeno}</p>
      <p className="nota">Piastrine: {dati.piastrine_dose}</p>

      <p className="scheda-titolo">Sequenza di somministrazione</p>
      <ol className="lista-riferimento">
        {dati.sequenza.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

function SezioneCalcolatorePesoPPH({ dati, pesoKg }) {
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Calcolatore PPH</h2>
        <BadgeVerifica verificato={dati.verificato} />
      </div>
      <p className="avviso">{dati._nota}</p>

      <p className="scheda-titolo">Dosi fisse (riferimento, NON scalare per peso)</p>
      <ul className="lista-riferimento">
        {Object.entries(dati.dosi_fisse).map(([nome, valore]) => (
          <li key={nome}>
            <span className="chip-capitalizza">{nome.replace(/_/g, ' ')}</span>: {valore}
          </li>
        ))}
      </ul>

      <p className="scheda-titolo">Voci peso-dipendenti</p>
      {!(pesoKg > 0) && <p className="avviso">Imposta il peso nel profilo per calcolare.</p>}
      <div className="lista-voci-ostetricia">
        {dati.peso_dipendenti.map((voce) => {
          let risultato = null
          let errore = null
          if (pesoKg > 0) {
            try {
              risultato = calcolaDose(voce, pesoKg)
            } catch (e) {
              errore = e.message
            }
          }

          return (
            <div key={voce.id} className="voce-ostetricia">
              <p className="scheda-titolo">{voce.nome}</p>
              {errore && <p className="avviso avviso-errore">{errore}</p>}
              {risultato && (
                <>
                  <p className="risultato-primario">{formatoRisultato(risultato)}</p>
                  <p className="formula">{risultato.formula}</p>
                </>
              )}
              {voce.note && <p className="nota">{voce.note}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SezionePreeclampsia({ dati }) {
  const { mgso4 } = dati
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Preeclampsia / eclampsia</h2>
        <BadgeVerifica verificato={mgso4.verificato} />
      </div>
      <p className="nota">Carico: {mgso4.carico}</p>
      <p className="nota">Mantenimento: {mgso4.mantenimento}</p>
      <p className="nota">Monitoraggio: {mgso4.monitoraggio}</p>
      <p className="nota">Antidoto: {mgso4.antidoto}</p>
      <p className="avviso">{mgso4.note}</p>
    </div>
  )
}

function SezioneRianimazioneNeonatale({ dati, adrenalina }) {
  return (
    <div className="riquadro-ostetricia">
      <div className="riga-meta">
        <h2>Rianimazione neonatale</h2>
        <BadgeVerifica verificato={false} />
      </div>

      <div className="tabella-scroll">
        <table className="tabella-apgar">
          <thead>
            <tr>
              <th>Parametro</th>
              <th>0</th>
              <th>1</th>
              <th>2</th>
            </tr>
          </thead>
          <tbody>
            {dati.apgar.map((riga) => (
              <tr key={riga.parametro}>
                <td className="chip-capitalizza">{riga.parametro}</td>
                <td>{riga['0']}</td>
                <td>{riga['1']}</td>
                <td>{riga['2']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="nota algoritmo-neonatale">{dati.algoritmo}</p>

      <div className="scheda">
        <p className="scheda-titolo">Adrenalina</p>
        {adrenalina ? (
          <>
            <p className="risultato-primario">
              {adrenalina.min}-{adrenalina.max} {adrenalina.unita}
            </p>
            <p className="nota">
              Fonte: farmaci.json (adrenalina, contesto "{adrenalina.contesto}") — {adrenalina.note}
            </p>
            <p className="avviso">
              Il peso del neonato non fa parte di questo profilo (che descrive la gestante):
              applicare il range al peso reale del neonato al momento della rianimazione.
            </p>
          </>
        ) : (
          <p className="avviso avviso-errore">
            Voce "adrenalina" con contesto "neonato" non trovata in farmaci.json.
          </p>
        )}
      </div>
    </div>
  )
}
