import { RCC } from '../typings'
import { htmlTagsProxy, prefixProxy, toPascalCase } from './proxy-helpers'

import { createComponentsData } from './create-components-data'

export const styleCompiler = (style: any) => {
  const { createComponentData, componentsKeys } = createComponentsData(style)

  const prefixRef = { value: 'S.' }

  const rccsData = componentsKeys.reduce(
    (prev, componentName) => {
      const { createCSSCompponent, getComponentClassNames } =
        createComponentData(componentName)
      return {
        $cn: {
          ...prev,
          [toPascalCase(componentName)]: getComponentClassNames
        },
        rccs: {
          ...prev.rccs,
          [toPascalCase(componentName)]: htmlTagsProxy(
            createCSSCompponent,
            prefixRef
          )
        }
      }
    },
    { $cn: {} as any, rccs: {} as any }
  )

  return {
    $cn: rccsData.$cn,
    rccs: prefixProxy(rccsData.rccs, prefixRef) as {
      [Key: string]: RCC<any>
    }
  }
}
