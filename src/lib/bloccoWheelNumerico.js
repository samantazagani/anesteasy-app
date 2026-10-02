// Su un <input type="number"> col focus la rotellina cambia il valore (70 -> 70.1): in una
// pagina che si scorre con la rotellina o col trackpad e' un modo silenzioso di alterare un
// peso o una dose. Togliere il focus mentre arriva l'evento impedisce la modifica e lascia
// scorrere la pagina normalmente.
export function gestisciWheel(e) {
  const el = e.target
  if (el && el.tagName === 'INPUT' && el.type === 'number' && typeof el.blur === 'function') {
    el.blur()
  }
}

/** Valido per ogni input numerico dell'app, presente e futuro. Restituisce la funzione di pulizia. */
export function installaBloccoWheelNumerico(doc = document) {
  doc.addEventListener('wheel', gestisciWheel, { passive: true })
  return () => doc.removeEventListener('wheel', gestisciWheel)
}
