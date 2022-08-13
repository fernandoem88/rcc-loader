import React from 'react'
import { render, screen } from '@testing-library/react'
import { createRccHelper } from '../../rcc-core'
const styleArr = [
  'Wrapper',
  'Wrapper--dark-mode',
  'Btn',
  'Btn--sm_as_size',
  'Btn--lg_as_size',
  'DeleteBtn',
  'DeleteBtn_ext_Btn',
  'DeleteBtn--border-radius-2px'
]

describe('', () => {
  const style = styleArr.reduce((prev, key) => {
    return { ...prev, [key]: key }
  }, {} as { [key: string]: string })

  const createRCC = createRccHelper(style, { prefix: 'S.' })
  const S = {
    Wrapper: createRCC<{ 'dark-mode'?: boolean }>('Wrapper'),
    Btn: createRCC<{ $size?: 'sm' | 'lg' }>('Btn'),
    DeleteBtn: createRCC<any>('DeleteBtn')
  }
  it('should render Wrapper component with the correct classname', async () => {
    render(<S.Wrapper>I am a wrapper</S.Wrapper>)
    const el = await screen.findByText('I am a wrapper')
    expect(el.className).toContain('Wrapper')
    expect(el.tagName).toBe('DIV')
  })

  it('should render Wrapper component as a span element', async () => {
    render(
      <>
        <S.Wrapper $as='span'>I am a wrapper</S.Wrapper>
        <S.Wrapper.span>I am a proxy</S.Wrapper.span>
      </>
    )
    const el = await screen.findByText('I am a wrapper')
    expect(el.tagName).toBe('SPAN')

    const proxyEl = await screen.findByText('I am a proxy')
    expect(proxyEl.className).toContain('Wrapper')
    expect(proxyEl.tagName).toBe('SPAN')
  })

  it('should map Wrapper components props properly', async () => {
    render(
      <>
        <S.Wrapper $dark-mode>dark mode</S.Wrapper>
        <S.Wrapper $dark-mode={false}>no dark mode</S.Wrapper>
      </>
    )
    const darkModeEl = await screen.findByText('dark mode')
    expect(darkModeEl.className).toContain('Wrapper')
    expect(darkModeEl.className).toContain('Wrapper--dark-mode')

    const noDarkModeEl = await screen.findByText('no dark mode')
    expect(noDarkModeEl.className).toContain('Wrapper')
    expect(noDarkModeEl.className.includes('Wrapper--dark-mode')).toBeFalsy()
  })

  it('should handle ternary class props properly', async () => {
    render(
      <>
        <S.Btn.button $size='sm'>small button</S.Btn.button>
        <S.Btn.button $size='lg'>large button</S.Btn.button>
      </>
    )
    const smBtn = await screen.findByText('small button')
    expect(smBtn.className).toContain('Btn')
    expect(smBtn.className).toContain('Btn--sm_as_size')
    expect(smBtn.className.includes('Btn--lg_as_size')).toBeFalsy()

    const lgBtn = await screen.findByText('large button')
    expect(lgBtn.className).toContain('Btn')
    expect(lgBtn.className).toContain('Btn--lg_as_size')
    expect(lgBtn.className.includes('Btn--sm_as_size')).toBeFalsy()
  })
})
