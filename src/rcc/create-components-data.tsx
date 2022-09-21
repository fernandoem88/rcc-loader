import React from 'react'

import { ComponentData } from '../typings'
import { toPascalCase } from './proxy-helpers'
import {
  checkRecursiveExtensions,
  findComponentKeys,
  findComponentPropsMap
} from './classnames-parsers'

export const createComponentsData = (style: any) => {
  const search = Object.keys(style).join('\n') // multilines

  const componentsData = {} as { [ComponentName: string]: ComponentData }
  const componentsKeys = findComponentKeys(search)
  const globalClassNamesMap = findComponentPropsMap(search, '')

  // the default class is not a component property
  delete globalClassNamesMap.DEFAULT
  const defaultClassName = style['--DEFAULT'] ? style['--DEFAULT'] + ' ' : ''

  Object.keys(componentsKeys).forEach((componentName) => {
    const propClassMapping = findComponentPropsMap(search, componentName)
    const { extensions } = componentsKeys[componentName]
    componentsData[componentName] = { extensions, propClassMapping }
  })

  Object.keys(componentsData).forEach((componentName) => {
    checkRecursiveExtensions(componentName, componentsData)
  })

  const createComponentData = (componentName: string) => {
    const getComponentClassNames = ({
      className: __cn,
      ...$cn
    }: { [$prop: string]: any } = {}) => {
      //
      const inputClassName = __cn ? __cn + ' ' : ''
      return Object.keys($cn || {}).reduce((finalClassName, $prop) => {
        //
        const propValue = $cn[$prop]
        if (!propValue) return finalClassName

        const dirtyClasses = store.propsKeys[$prop]

        if (!dirtyClasses) return finalClassName

        const newClass = dirtyClasses.reduce((jjClassName, dirtyClass) => {
          const cleanClass = style[dirtyClass.replace('[?]', propValue) || '']
          return cleanClass ? jjClassName + ' ' + cleanClass : jjClassName
        }, '')

        return newClass ? finalClassName + ' ' + newClass : finalClassName
      }, inputClassName + store.rootClassName)
    }

    const store = {
      propsKeys: {} as { [$prop: string]: string[] },
      rootClassName: ''
    }

    const updateStore = (mapping: {}) => {
      const propsEntries = Object.entries(mapping)
      propsEntries.forEach(([$prop, dirtyClass]) => {
        store.propsKeys[$prop] = store.propsKeys[$prop] || []
        store.propsKeys[$prop].push(dirtyClass as string)
      })
    }

    // const init = async () => {
    const { extensions } = componentsData[componentName]
    const rootClassName =
      defaultClassName +
      [style[componentName], ...extensions.map((ext) => style[ext] || '')].join(
        ' '
      )

    store.rootClassName = rootClassName

    updateStore(globalClassNamesMap)

    const componentsArray = [componentName, ...extensions]
    componentsArray.forEach((jjComponent) => {
      const mapping = componentsData[jjComponent].propClassMapping
      updateStore(mapping)
    })
    // }
    // init()

    const PROPS_KEYS_ARR = Object.keys(store.propsKeys)

    const createCSSCompponent = (Element: string, prefix: string = 'S.') => {
      const CSSComponent: React.FC = React.forwardRef(function (
        props: any,
        ref
      ) {
        const { children, className, $cn, ...rest } = props

        const classDeps = PROPS_KEYS_ARR.map(
          (k) => $cn?.[k]
        ) as React.DependencyList

        const computedClassName = React.useMemo(
          () => getComponentClassNames($cn),
          // eslint-ignore-next-line react-hooks/exhaustive-deps
          classDeps
        )

        const inputClassName = className ? className + ' ' : ''

        return (
          <Element
            {...rest}
            className={inputClassName + computedClassName}
            ref={ref}
          >
            {children}
          </Element>
        )
      })

      CSSComponent.displayName = `${prefix}${toPascalCase(componentName)}`
      return CSSComponent
    }

    const withCreator = createCSSCompponent as any
    withCreator.__with = (component: any) =>
      createCSSCompponent(component, withCreator.__prefix__.value)

    return {
      getComponentClassNames,
      createCSSCompponent
    }
  }

  return { createComponentData, componentsKeys: Object.keys(componentsKeys) }
}
