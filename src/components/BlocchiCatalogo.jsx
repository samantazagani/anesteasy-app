import { useMemo, useState } from 'react'
import '../styles/risultato.css'
import './BlocchiCatalogo.css'

const REGIONE_TUTTE = '__tutte__'

// Solo dati consultabili (data/anestetici-locali.json > blocchi_catalogo): quale blocco
// copre quali regioni. L'interfaccia dell'omino cliccabile (che userebbe anche
// logica_combinazione per proporre la combinazione migliore su piu' regioni scelte insieme)
// e' volutamente fuori scope qui - una tabella filtrabile per nome/regione, non altro.
export function BlocchiCatalogo({ dati }) {
  const [ricerca, setRicerca] = useState('')
  const [regione, setRegione] = useState(REGIONE_TUTTE)

  const voci = useMemo(
    () => Object.entries(dati.blocchi).map(([nome, voce]) => ({ nome, ...voce })),
    [dati],
  )

  const vociFiltrate = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    return voci.filter((v) => {
      const matchRegione = regione === REGIONE_TUTTE || v.copre.includes(regione)
      const matchRicerca = q === '' || v.nome.toLowerCase().includes(q) || v.descrizione.toLowerCase().includes(q)
      return matchRegione && matchRicerca
    })
  }, [voci, ricerca, regione])

  return (
    <div className="riquadro-blocchi-catalogo">
      <h2>Catalogo blocchi: cosa copre ciascuno</h2>
      <p className="nota">
        Dati di riferimento (copertura di ogni blocco), consultabili per nome o per regione
        anatomica. Non sceglie ne' combina blocchi per te.
      </p>

      <div className="filtri-blocchi">
        <label className="campo-numerico">
          Cerca blocco
          <input
            type="search"
            placeholder="es. ascellare"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
        </label>
        <label className="campo-numerico">
          Filtra per regione
          <select value={regione} onChange={(e) => setRegione(e.target.value)}>
            <option value={REGIONE_TUTTE}>Tutte le regioni</option>
            {Object.entries(dati.etichette_regioni).map(([chiave, label]) => (
              <option key={chiave} value={chiave}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tabella-scroll">
        <table className="tabella-blocchi">
          <thead>
            <tr>
              <th>Blocco</th>
              <th>Copre</th>
              <th>Descrizione</th>
            </tr>
          </thead>
          <tbody>
            {vociFiltrate.map((v) => (
              <tr key={v.nome}>
                <td className="blocco-nome">{v.nome}</td>
                <td>{v.copre.map((r) => dati.etichette_regioni[r] ?? r).join(', ')}</td>
                <td>{v.descrizione}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vociFiltrate.length === 0 && <p className="nessun-risultato">Nessun blocco trovato.</p>}
      </div>
    </div>
  )
}
