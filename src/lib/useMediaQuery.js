import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
  const [corrisponde, setCorrisponde] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const aggiorna = () => setCorrisponde(mql.matches)
    aggiorna()
    mql.addEventListener('change', aggiorna)
    return () => mql.removeEventListener('change', aggiorna)
  }, [query])
  return corrisponde
}
