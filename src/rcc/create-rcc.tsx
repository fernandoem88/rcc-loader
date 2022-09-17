import React from 'react'

import { ComponentData, RCC } from '../typings'

import { addHTMLTags } from './html-tags-helper'
import {
  checkRecursiveExtensions,
  findComponentKeys,
  findComponentPropsMap,
  prefixProxy
} from './rcc-helper'

const toKebabCase = (str: string) =>
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
        }, props.className || '')
      }

      const store = {
        propsKeys: {} as { [$prop: string]: string[] },
        emptyKeys: {},
        rootClassName: ''
      }

      const updateStore = (mapping: {}) => {
        const propsEntries = Object.entries(mapping)
        propsEntries.forEach(([$prop, dirtyClass]) => {
          store.emptyKeys[$prop] = undefined
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

      const keysArray = Object.keys(store.propsKeys)

      const CSSComponent = React.forwardRef(function (props: any, ref) {
        const { children, $cn, ...rest } = props

        const classDeps = keysArray.map(
          (k) => props.$cn?.[k]
        ) as React.DependencyList

        const className = React.useMemo(
          () => getComponentClassNames(props),
          classDeps
        )

        return (
          <Element
            {...rest}
            className={`${store.rootClassName} ${className}`}
            ref={ref}
          >
            {children}
          </Element>
        )
      })

      CSSComponent.displayName = `${prefix}${toKebabCase(componentName)}`
      return CSSComponent
    }

  const prefix = { value: 'S.' }

  const rccs = Object.keys(componentsData).reduce((prev, componentName) => {
    return {
      ...prev,
      [toKebabCase(componentName)]: addHTMLTags(
        createComponentElement(componentName),
        prefix
      )
    }
  }, {} as any)

  return prefixProxy(rccs, prefix) as {
    [Key: string]: RCC<any>
  }
}
