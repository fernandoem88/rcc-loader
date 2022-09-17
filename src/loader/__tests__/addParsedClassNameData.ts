import helpers from '../loader-helpers'
import { LoaderComponentData } from '../../typings'

describe('parse and add className using addParsedClassNameData utility', () => {
  let components = {} as { [key: string]: LoaderComponentData }
  beforeAll(() => {
    components = {}
  })
  it('should parse a simple className', () => {
    helpers.addParsedClassNameData('Btn--large-btn', components)

    expect(components.Btn).toBeDefined()
    expect(components.Btn.props.largeBtn).toBeDefined()
    expect(components.Btn.classNamesPropsMapping.largeBtn).toEqual(
      'Btn--large-btn'
    )
  })

  it('should parse 2 ternary classNames', () => {
    helpers.addParsedClassNameData('Btn--sm_as_size', components)
    helpers.addParsedClassNameData('Btn--lg_as_size', components)

    expect(components.Btn).toBeDefined()
    expect(components.Btn.props.size).toBeDefined()
    expect(components.Btn.classNamesPropsMapping.size).toBeDefined()
    expect(components.Btn.classNamesPropsMapping.size.sm).toEqual(
      'Btn--sm_as_size'
    )
    expect(components.Btn.classNamesPropsMapping.size.lg).toEqual(
      'Btn--lg_as_size'
    )
  })

  it('should parse a className extension', () => {
    helpers.addParsedClassNameData('DeleteBtn_ext_Btn', components)
    expect(components.DeleteBtn).toBeDefined()
    expect(components.Btn).toBeDefined()
    expect(components.DeleteBtn.extensions.has('Btn')).toBeTruthy()
  })
})
