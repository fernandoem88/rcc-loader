import React from 'react'
import { render, screen } from '@testing-library/react'
import { styleCompiler } from '../rcc-core'
import { RCC } from '../../typings'

const styleArr = [
  '--DEFAULT',
  'wrapper',
  'wrapper--dark-mode',
  'base-btn',
  'base-btn--size',
  'btn_ext_base-btn',
  'btn',
  'btn--sm_as_size',
  'btn--lg_as_size',

  'delete-btn',
  'delete-btn_ext_btn',
  'deleteBtn--border-radius-2px',
  '--fs-12px_as_font-size',
  '--fs-15px_as_font-size'
]

interface GlobalProps {
  fontSize?: 'fs-12px' | 'fs-15px'
}

describe('components classnames and props mapping', () => {
  const style = styleArr.reduce((prev, key) => {
    return { ...prev, [key]: key }
  }, {} as { [key: string]: string })

  const S = styleCompiler(style as any).rccs as {
    Wrapper: RCC<{ darkMode?: boolean } & GlobalProps>
    Btn: RCC<{ size?: 'sm' | 'lg' } & GlobalProps>
    DeleteBtn: RCC<{ borderRadius2px?: boolean } & GlobalProps>
  }
  it('should render Wrapper component with the correct classname', async () => {
    render(<S.Wrapper.div>I am a wrapper</S.Wrapper.div>)
    const el = await screen.findByText('I am a wrapper')
    expect(el.className).toContain('wrapper')
    expect(el.tagName).toBe('DIV')
  })

  it('should render Wrapper component as a span element', async () => {
    render(<S.Wrapper.span>I am a span</S.Wrapper.span>)

    const el = await screen.findByText('I am a span')
    expect(el.className).toContain('wrapper')
    expect(el.tagName).toBe('SPAN')
  })

  it('should map Wrapper components props properly', async () => {
    render(
      <React.Fragment>
        <S.Wrapper.div $cn={{ darkMode: true }}>dark mode</S.Wrapper.div>
        <S.Wrapper.div>no dark mode</S.Wrapper.div>
      </React.Fragment>
    )
    const darkModeEl = await screen.findByText('dark mode')
    expect(darkModeEl.className).toContain('wrapper')
    expect(darkModeEl.className).toContain('wrapper--dark-mode')

    const noDarkModeEl = await screen.findByText('no dark mode')
    expect(noDarkModeEl.className).toContain('wrapper')
    expect(noDarkModeEl.className.includes('wrapper--dark-mode')).toBeFalsy()
  })

  it('should handle global props properly', async () => {
    render(
      <React.Fragment>
        <S.Wrapper.div $cn={{ fontSize: 'fs-12px' }}>font 12</S.Wrapper.div>
        <S.Wrapper.div $cn={{ fontSize: 'fs-15px' }}>font 15</S.Wrapper.div>
      </React.Fragment>
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
      <React.Fragment>
        <S.Btn.button $cn={{ size: 'sm' }}>small button</S.Btn.button>
        <S.Btn.button $cn={{ size: 'lg' }}>large button</S.Btn.button>
      </React.Fragment>
    )
    const smBtn = await screen.findByText('small button')
    expect(smBtn.className).toContain('btn')
    expect(smBtn.className).toContain('btn--sm_as_size')
    expect(smBtn.className.includes('btn--lg_as_size')).toBeFalsy()

    const lgBtn = await screen.findByText('large button')
    expect(lgBtn.className).toContain('btn')
    expect(lgBtn.className).toContain('btn--lg_as_size')
    expect(lgBtn.className.includes('btn--sm_as_size')).toBeFalsy()
  })

  it('should handle extension props properly', async () => {
    render(
      <React.Fragment>
        <S.Btn.button>I am a button</S.Btn.button>
        <S.Btn.button $cn={{ size: 'lg' }}>button with size</S.Btn.button>
      </React.Fragment>
    )
    const btn = await screen.findByText('I am a button')
    expect(btn.className).toContain('btn')
    // Btn extends BaseBtn so it should have also BaseBtn class
    expect(btn.className).toContain('base-btn')
    // base-btn size is false whenever Btn size is falsy
    expect(btn.className.includes('base-btn--size')).toBeFalsy()

    const btnWithSize = await screen.findByText('button with size')
    expect(btnWithSize.className).toContain('btn')
    // Btn extends base-btn so it should have also base-btn class
    expect(btnWithSize.className).toContain('base-btn')
    expect(btnWithSize.className).toContain('btn--lg_as_size')
    // base-btn size is true whenever Btn size is truthy
    expect(btnWithSize.className).toContain('base-btn--size')
  })
})
