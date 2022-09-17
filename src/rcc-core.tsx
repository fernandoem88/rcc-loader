import React from 'react'
import { ComponentData, RCC } from './typings'
import { addHTMLTags } from './rcc/addHTMLTags'
import {
  checkRecursiveExtensions,
  findComponentKeys,
  findComponentPropsMap,
  prefixProxy
} from './rcc/rcc-helper'

const getTag = ($as: string | { tag: any }) => {
  const tag = typeof $as === 'string' ? $as : 'tag' in $as ? $as.tag : $as
  return tag
}

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

  const createComponentElement = <Props,>(componentName: string) => {
    const getComponentClassNames = (props: any) => {
      return Object.entries(store.propsKeys).reduce(
        (iiClassName, [$prop, dirtyClasses]) => {
          const propValue = props[$prop]
          if (!propValue) return iiClassName

          const newClass = dirtyClasses.reduce((jjClassName, dirtyClass) => {
            const cleanClass = style[dirtyClass.replace('[?]', propValue) || '']
            return cleanClass ? jjClassName + ' ' + cleanClass : jjClassName
          }, '')

          return newClass ? iiClassName + ' ' + newClass : iiClassName
        },
        props.className || ''
      )
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

    const keysArray = Object.keys(store.propsKeys)

    const CSSComponent = React.forwardRef(function (props: any, ref) {
      const { children, $as = 'div', ...rest } = props

      const classDeps = keysArray.map((k) => props[k])

      const className = React.useMemo(
        () => getComponentClassNames(props),
        classDeps
      )
      const tag = getTag($as)
      const Element = tag

      return (
        <Element
          {...rest}
          {...store.emptyKeys}
          className={`${store.rootClassName} ${className}`}
          ref={ref}
        >
          {children}
        </Element>
      )
    })

    CSSComponent.displayName = `S.${componentName}`
    return addHTMLTags<Props>(CSSComponent as any)
  }

  const rccs = Object.keys(componentsData).reduce((prev, componentName) => {
    return { ...prev, [componentName]: createComponentElement(componentName) }
  }, {} as any)

  return prefixProxy(rccs) as { [Key: string]: RCC<any> }
}
