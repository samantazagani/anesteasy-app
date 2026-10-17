import { useEffect, useRef } from 'react'
import './SezioniPieghevoli.css'

const CHEVRON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>'

// Rende richiudibili le sezioni (card) di un modulo lungo: titolo sempre visibile, contenuto
// nascosto quando e' chiusa. Le card sono trovate nel DOM con un selettore, quindi nessuna
// sezione va modificata. Il pulsante accanto al titolo e' un vero <button> (tastiera e lettori
// di schermo, aria-expanded); anche un tocco sull'intestazione apre e chiude.
//
// inizio: quali sezioni partono aperte, oltre a quelle che corrispondono a `aperte`
//   'prima'   la prima del modulo
//   'gruppo'  la prima di ogni gruppo (es. di ogni categoria di calcolatori)
//   'nessuna' nessuna
// Va messo dentro la <section> del modulo, PRIMA di <IndiceSezioni>. Lo stato vive nel DOM
// (data-aperta): l'indice apre una sezione con l'evento "sezione-imposta" e ascolta
// "sezione-cambiata".
export function SezioniPieghevoli({ schede, titolo = 'h2', aperte = '', inizio = 'prima' }) {
  const marcatore = useRef(null)

  useEffect(() => {
    const sezione = marcatore.current?.closest('section')
    if (!sezione) return undefined

    const cards = [...sezione.querySelectorAll(schede)]
    const pulizia = []

    cards.forEach((card, indice) => {
      const t = card.querySelector(titolo)
      const intestazione = t && [...card.children].find((figlio) => figlio.contains(t))
      if (!intestazione) return

      const fratelli = [...card.parentElement.children].filter((f) => f.matches(schede))
      const apertaDiPartenza =
        (aperte && card.matches(aperte)) ||
        (inizio === 'prima' && indice === 0) ||
        (inizio === 'gruppo' && fratelli[0] === card)

      const testoTitolo = t.textContent.trim()
      const bottone = document.createElement('button')
      bottone.type = 'button'
      bottone.className = 'sezione-chevron'
      bottone.innerHTML = CHEVRON

      function imposta(aperta, notifica = true) {
        card.dataset.aperta = String(aperta)
        bottone.setAttribute('aria-expanded', String(aperta))
        bottone.setAttribute('aria-label', `${aperta ? 'Chiudi' : 'Apri'} la sezione ${testoTitolo}`)
        if (notifica) card.dispatchEvent(new CustomEvent('sezione-cambiata', { bubbles: true }))
      }

      function alterna(e) {
        const interno = e.target.closest('a, input, select, textarea, label, button')
        if (interno && interno !== bottone) return
        imposta(card.dataset.aperta !== 'true')
      }
      const suImposta = (e) => imposta(Boolean(e.detail?.aperta))

      card.setAttribute('data-pieghevole', '')
      intestazione.setAttribute('data-intestazione', '')
      intestazione.appendChild(bottone)
      imposta(apertaDiPartenza, false)

      intestazione.addEventListener('click', alterna)
      card.addEventListener('sezione-imposta', suImposta)

      pulizia.push(() => {
        intestazione.removeEventListener('click', alterna)
        card.removeEventListener('sezione-imposta', suImposta)
        bottone.remove()
        intestazione.removeAttribute('data-intestazione')
        card.removeAttribute('data-pieghevole')
        card.removeAttribute('data-aperta')
      })
    })

    sezione.dispatchEvent(new CustomEvent('sezione-cambiata'))
    return () => pulizia.forEach((f) => f())
  }, [schede, titolo, aperte, inizio])

  return <span ref={marcatore} hidden />
}
