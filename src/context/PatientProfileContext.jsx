import { createContext, useContext, useMemo, useState } from 'react'
import { calcBMI, calcIBW, calcLBW, round1 } from '../lib/anthropometrics'

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
    return {
      bmi: round1(calcBMI(pesoKg, altezzaCm)),
      ibw: round1(calcIBW(altezzaCm, sesso)),
      lbw: round1(calcLBW(pesoKg, altezzaCm, sesso)),
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
