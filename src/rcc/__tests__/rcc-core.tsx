import React from 'react'
import { render, screen } from '@testing-library/react'
import { createRccHelper } from '../../rcc-core'
const styleArr = [
  '--DEFAULT',
  'Wrapper',
  'Wrapper--dark-mode',
  'BaseBtn',
  'BaseBtn--size',
  'Btn_ext_BaseBtn',
  'Btn',
  'Btn--sm_as_size',
  'Btn--lg_as_size',

  'DeleteBtn',
  'DeleteBtn_ext_Btn',
  'DeleteBtn--border-radius-2px',
  '--fs-12px_as_font-size',
  '--fs-15px_as_font-size'
]

interface GlobalProps {
  '$font-size'?: 'fs-12px' | 'fs-15px'
}

describe('components classnames and props mapping', () => {
  const style = styleArr.reduce((prev, key) => {
    return { ...prev, [key]: key }
  }, {} as { [key: string]: string })

  const createRCC = createRccHelper(style, { prefix: 'S.' })
  const S = {
    Wrapper: createRCC<{ 'dark-mode'?: boolean } & GlobalProps>('Wrapper'),
    Btn: createRCC<{ $size?: 'sm' | 'lg' } & GlobalProps>('Btn'),
    DeleteBtn: createRCC<{ 'border-radius-2px'?: boolean } & GlobalProps>(
      'DeleteBtn'
    )
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

  it('should handle global props properly', async () => {
    render(
      <>
        <S.Wrapper $font-size='fs-12px'>font 12</S.Wrapper>
        <S.Wrapper $font-size='fs-15px'>font 15</S.Wrapper>
      </>
    )
    const font12El = await screen.findByText('font 12')
    expect(font12El.className).toContain('--fs-12px_as_font-size')
    expect(font12El.className.includes('--fs-15px_as_font-size')).toBeFalsy()

    const font15El = await screen.findByText('font 15')
    expect(font15El.className).toContain('--fs-15px_as_font-size')
    expect(font15El.className.includes('--fs-12px_as_font-size')).toBeFalsy()
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

  it('should handle extension props properly', async () => {
    render(
      <>
        <S.Btn.button>I am a button</S.Btn.button>
        <S.Btn.button $size='lg'>button with size</S.Btn.button>
      </>
    )
    const btn = await screen.findByText('I am a button')
    expect(btn.className).toContain('Btn')
    // Btn extends BaseBtn so it should have also BaseBtn class
    expect(btn.className).toContain('BaseBtn')
    // BaseBtn size is false whenever Btn size is falsy
    expect(btn.className.includes('BaseBtn--size')).toBeFalsy()

    const btnWithSize = await screen.findByText('button with size')
    expect(btnWithSize.className).toContain('Btn')
    // Btn extends BaseBtn so it should have also BaseBtn class
    expect(btnWithSize.className).toContain('BaseBtn')
    expect(btnWithSize.className).toContain('Btn--lg_as_size')
    // BaseBtn size is true whenever Btn size is truthy
    expect(btnWithSize.className).toContain('BaseBtn--size')
  })
})
