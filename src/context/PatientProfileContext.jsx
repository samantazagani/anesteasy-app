import { createContext, useContext, useMemo, useState } from 'react'
import { calcBMI, calcIBW, calcLBW, calcPBW, calcABW, round1 } from '../lib/anthropometrics'

const PatientProfileContext = createContext(null)

const initialProfile = {
  sesso: null, // 'M' | 'F'
  eta: null, // anni
  pesoKg: null,
  altezzaCm: null,
}

export function PatientProfileProvider({ children }) {
  const [profile, setProfileState] = useState(initialProfile)

  const setProfile = (patch) => {
    setProfileState((prev) => ({ ...prev, ...patch }))
  }

  const resetProfile = () => setProfileState(initialProfile)

  const derived = useMemo(() => {
    const { sesso, pesoKg, altezzaCm } = profile
    // ibw non arrotondato: serve "pieno" per calcABW, che somma una frazione del reale ad
    // esso. L'IBW esposto nel contesto resta arrotondato a 1 decimale come gli altri.
    const ibwPieno = calcIBW(altezzaCm, sesso)
    return {
      bmi: round1(calcBMI(pesoKg, altezzaCm)),
      ibw: round1(ibwPieno),
      lbw: round1(calcLBW(pesoKg, altezzaCm, sesso)),
      // pbw e' un percorso indipendente da ibw (vedi calcPBW in anthropometrics.js): non va
      // mai fatto dipendere dal guard pediatrico di pesoResolver.js pensato per i farmaci.
      pbw: round1(calcPBW(altezzaCm, sesso)),
      abw: round1(calcABW(pesoKg, ibwPieno)),
    }
  }, [profile])

  const value = useMemo(
    () => ({ profile, setProfile, resetProfile, ...derived }),
    [profile, derived],
  )

  return (
    <PatientProfileContext.Provider value={value}>
      {children}
    </PatientProfileContext.Provider>
  )
}

export function usePatientProfile() {
  const ctx = useContext(PatientProfileContext)
  if (!ctx) {
    throw new Error('usePatientProfile deve essere usato dentro <PatientProfileProvider>')
  }
  return ctx
}
