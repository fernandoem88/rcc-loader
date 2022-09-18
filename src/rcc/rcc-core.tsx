import React from 'react'

import { ComponentData, RCC } from '../typings'
import { htmlTagsProxy, prefixProxy } from './proxy-helpers'
import {
  checkRecursiveExtensions,
  findComponentKeys,
  findComponentPropsMap
} from './classnames-parsers'

const toPascalCase = (str: string) =>
  str.replace(/^[a-z0-9]|-[a-z0-9]/g, (match) =>
    match.toUpperCase().replace('-', '')
  )

export const toRCC = (style: any) => {
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

  const createComponentElement =
    (componentName: string) =>
    (Element: any = 'div', prefix: string = 'S.') => {
      const getComponentClassNames = (props: any) => {
        return Object.keys(props.$cn || {}).reduce((finalClassName, $prop) => {
          const propValue = props.$cn[$prop]

          if (!propValue) return finalClassName

          const dirtyClasses = store.propsKeys[$prop]

          const newClass = dirtyClasses.reduce((jjClassName, dirtyClass) => {
            const cleanClass = style[dirtyClass.replace('[?]', propValue) || '']
            return cleanClass ? jjClassName + ' ' + cleanClass : jjClassName
          }, '')

          return newClass ? finalClassName + ' ' + newClass : finalClassName
        }, '')
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
        [
          style[componentName],
          ...extensions.map((ext) => style[ext] || '')
        ].join(' ')

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

      const CSSComponent = React.forwardRef(function (props: any, ref) {
        const { children, className, $cn, ...rest } = props

        const classDeps = PROPS_KEYS_ARR.map(
          (k) => props.$cn?.[k]
        ) as React.DependencyList

        const computedClassName = React.useMemo(
          () => getComponentClassNames(props),
          classDeps
        )

        const inputClassName = className ? className + ' ' : ''
        /*
        return React.createElement(Element, {
          ...rest,
          ref,
          className: `${inputClassName}${store.rootClassName} ${computedClassName}`
        })
         */
        return (
          <Element
            {...rest}
            className={`${inputClassName}${store.rootClassName} ${computedClassName}`}
            ref={ref}
          >
            {children}
          </Element>
        )
      })

      CSSComponent.displayName = `${prefix}${toPascalCase(componentName)}`
      return CSSComponent
    }

  const prefixRef = { value: 'S.' }

  const rccs = Object.keys(componentsData).reduce((prev, componentName) => {
    return {
      ...prev,
      [toPascalCase(componentName)]: htmlTagsProxy(
        createComponentElement(componentName),
        prefixRef
      )
    }
  }, {} as any)

  return prefixProxy(rccs, prefixRef) as {
    [Key: string]: RCC<any>
  }
}
