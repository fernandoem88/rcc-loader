import helpers from '../loader-helpers'

describe('cleanCssString and getClassNamesFromCssString utilities', () => {
  const cssString = `
.class-1 {
    color: red;
}
/* this is a commented class
.stupid { color: red; }
/* .stupid-2 { color: red; } */
*/
// this is also another comment
.class-2,
[data-some-attr="skip-me-please"],
.class-3 {
    color: red;
}
.class-4:not(.class-5) {
    color: red;
}
  `

  it('should parse classNames from cssString', () => {
    const classNames = helpers.getClassNamesFromCssString(cssString)
    expect(classNames.indexOf('stupid')).toBe(-1)
    expect(classNames.length).toBe(5)
    expect(classNames).toEqual([
      'class-1',
      'class-2',
      'class-3',
      'class-4',
      'class-5'
    ])
  })
})
