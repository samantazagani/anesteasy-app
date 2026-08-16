import ostetriciaData from '../../data/ostetricia.json'
import farmaciData from '../../data/farmaci.json'
import { usePatientProfile } from '../context/PatientProfileContext.jsx'
import { calcolaDose } from '../lib/doseCalculator'
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
      <SezioneEmorragiaPostpartum dati={ostetriciaData.emorragia_postpartum} />
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

function SezioneEmorragiaPostpartum({ dati }) {
  return (
    <div className="riquadro-ostetricia">
      <h2>Emorragia postpartum</h2>
      <div className="lista-voci-ostetricia">
        {dati.uterotonici.map((u) => (
          <div key={u.ordine} className="voce-ostetricia">
            <div className="riga-meta">
              <span className="chip">{u.ordine}ª linea</span>
              <span className="chip chip-capitalizza">{u.farmaco}</span>
              <BadgeVerifica verificato={u.verificato} />
            </div>
            <p className="nota">{u.dose}</p>
            {u.controindicazioni && (
              <p className="avviso avviso-errore">Controindicazioni: {u.controindicazioni}</p>
            )}
          </div>
        ))}
        <div className="voce-ostetricia">
          <div className="riga-meta">
            <span className="chip">Antifibrinolitico</span>
            <span className="chip chip-capitalizza">{dati.antifibrinolitico.farmaco}</span>
            <BadgeVerifica verificato={dati.antifibrinolitico.verificato} />
          </div>
          <p className="nota">{dati.antifibrinolitico.dose}</p>
        </div>
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
            <p className="formula">
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
