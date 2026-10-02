import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Logomark } from './Logomark.jsx'

describe('Logomark', () => {
  const html = renderToStaticMarkup(<Logomark />)

  it('e un quadrato arrotondato viola pieno con tracciato ECG bianco non riempito', () => {
    expect(html).toContain('rx="8"')
    expect(html).toContain('fill="#8b5cf6"')
    expect(html).toContain('stroke="#ffffff"')
    expect(html).toContain('fill="none"')
  })

  it('nessun gradiente, decorativo per gli screen reader e dimensione configurabile', () => {
    expect(html).not.toMatch(/gradient/i)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('width="30"')
    expect(renderToStaticMarkup(<Logomark size={40} />)).toContain('width="40"')
  })
})
