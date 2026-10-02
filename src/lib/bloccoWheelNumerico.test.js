import { describe, expect, it, vi } from 'vitest'
import { gestisciWheel, installaBloccoWheelNumerico } from './bloccoWheelNumerico'

const campo = (tagName, type) => ({ tagName, type, blur: vi.fn() })

describe('gestisciWheel', () => {
  it('toglie il focus a un input numerico', () => {
    const el = campo('INPUT', 'number')
    gestisciWheel({ target: el })
    expect(el.blur).toHaveBeenCalledTimes(1)
  })

  it('non tocca altri input, select o elementi qualsiasi', () => {
    for (const el of [campo('INPUT', 'text'), campo('INPUT', 'search'), campo('SELECT', 'select-one'), campo('DIV', undefined)]) {
      gestisciWheel({ target: el })
      expect(el.blur).not.toHaveBeenCalled()
    }
  })

  it('tollera target assente', () => {
    expect(() => gestisciWheel({ target: null })).not.toThrow()
  })
})

describe('installaBloccoWheelNumerico', () => {
  it('registra un listener wheel passivo sul documento e lo rimuove con la pulizia', () => {
    const doc = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
    const pulisci = installaBloccoWheelNumerico(doc)
    expect(doc.addEventListener).toHaveBeenCalledWith('wheel', gestisciWheel, { passive: true })
    pulisci()
    expect(doc.removeEventListener).toHaveBeenCalledWith('wheel', gestisciWheel)
  })
})
