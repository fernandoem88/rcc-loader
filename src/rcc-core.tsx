import React from 'react'
import {
  BooleanProp,
  ComponentData,
  PropType,
  RCC,
  TaggedRCC,
  TernaryProp
} from './typings'
import { addHTMLTags } from './rcc/addHTMLTags'
import {
  checkRecursiveExtensions,
  findComponentKeys,
  findComponentPropsMap
} from './rcc/regex-helper'

const IS_DEV = process.env.NODE_ENV === 'development'

export const createRccHelper = <S extends Record<string, any>>(
  style: S,
  options?: { devDebugPrefix?: string }
) => {
  const search = Object.keys(style).join('\n') // multilines

  const componentsData = {} as { [ComponentName: string]: ComponentData }
  const globalProps = {} as { [PropName: string]: PropType }
  const componentsKeys = findComponentKeys(search)

  const globalClassNamesMap = findComponentPropsMap(search, '')
  // the default class is not a component property
  delete globalClassNamesMap.DEFAULT
  const defaultClassName = style['--DEFAULT'] || ''

  Object.entries(globalClassNamesMap).forEach((propClassMap) => {
    const [dirtyProp, className] = propClassMap
    // const key = findClassKeyByClassName(search, "", gcn);
    const isTernary = dirtyProp.indexOf('_as_') !== -1
    if (isTernary) {
      const [ternaryValue, ternaryName] = dirtyProp.split('_as_')
      const propsName = `$${ternaryName}`
      globalProps[propsName] = globalProps[propsName] || {
        values: {},
        type: 'ternary'
      }
      const ternaryProp = globalProps[propsName] as TernaryProp
      ternaryProp.values[ternaryValue] = { key: className }
    } else {
      const propsName = `$${dirtyProp}`
      globalProps[propsName] = {
        key: className,
        type: 'boolean'
      } as BooleanProp
    }
  })

  Object.keys(componentsKeys).forEach((componentName) => {
    const propsClassesMap = findComponentPropsMap(search, componentName)
    const nthComponentProps = {}

    Object.entries(propsClassesMap).forEach((propClassMap) => {
      const [dirtyProp, className] = propClassMap
      // const classKey = findClassKeyByClassName(search, componentkey, className);
      const isWrongClass = dirtyProp.indexOf('_ext_') !== -1
      if (isWrongClass) {
        console.warn(`found a wrong class definition '${className}':
        a React CSS Component classname should not contain the extension key '_ext_'.`)
        return
      }

      const isTernary = dirtyProp.indexOf('_as_') !== -1

      if (isTernary) {
        const [ternaryValue, ternaryName] = dirtyProp.split('_as_')
        const propsName = `$${ternaryName}`

        nthComponentProps[propsName] = nthComponentProps[propsName] || {
          type: 'ternary',
          values: {}
        }
        nthComponentProps[propsName].values[ternaryValue] = {
          key: className
        }
      } else {
        const propsName = `$${dirtyProp}`

        nthComponentProps[propsName] = {
          type: 'boolean',
          key: className
        }
      }
    })

    const { extensions } = componentsKeys[componentName]

    componentsData[componentName] = {
      extensions,
      props: nthComponentProps,
      legacy: {}
    }

    extensions.forEach((extPar) => {
      const parentData = componentsData[extPar]
      const parentPropsNames = Object.keys(parentData?.props || {})
      if (!parentPropsNames.length) {
        // console.log("no data found for extended parent", extPar);
        return
      }
      const propsLegacy = componentsData[componentName].legacy
      parentPropsNames.forEach((propName) => {
        propsLegacy[propName] = propsLegacy[propName] || { parentNames: [] }
        propsLegacy[propName].parentNames.push(extPar)
      })
    })
  })

  try {
    Object.keys(componentsData).forEach((componentName) => {
      checkRecursiveExtensions(componentName, componentsData)
    })
  } catch (e) {
    console.error(e)
  }

  const getComponentPropsKeys = (componentName: string) => {
    const ccData = componentsData[componentName]
    if (!ccData) {
      // console.log('empty props for component', componentName)
      return []
    }

    const globalKeys = Object.keys(globalProps)
    const ownKeys = Object.keys(ccData.props)
    const legacyKeys = Object.keys(ccData.legacy)
    const propsKeys = Array.from(
      new Set([...globalKeys, ...legacyKeys, ...ownKeys])
    )

    return propsKeys
  }

  const getPropClassNameValue = (
    propValue: boolean | string,
    propType: PropType | undefined
  ): string | null => {
    if (!propValue || !propType) return null

    if (propType.type === 'boolean') {
      const classKey = propType.key
      return style[classKey]
    } else if (typeof propValue === 'string' && propType.type === 'ternary') {
      const classKey = propType.values[propValue]?.key
      return style[classKey] || null
    }
    return null
  }

  const getComponentActiveClassNames = (
    props: any,
    componentName: string,
    propsKeys: string[],
    previousClassNamesRef: React.MutableRefObject<{
      [PropKey: string]: { propValue: string; className: string }
    }>
  ) => {
    const classNames: string[] = []
    const ownClass = style[componentName]

    !!ownClass && classNames.push(ownClass)
    !!defaultClassName && classNames.push(defaultClassName)
    !!props.className && classNames.push(props.className)

    const cData = componentsData[componentName]

    if (!cData) return ''

    const parentsClassName = cData.extensions
      .map((parent) => style[parent])
      .join(' ')

    if (parentsClassName) {
      classNames.push(parentsClassName)
    }

    propsKeys.forEach((propKey) => {
      const propValue = props[propKey]
      if (!propValue) return

      const previous = previousClassNamesRef.current[propKey]
      if (previous && previous.propValue === propValue) {
        !!previous.className && classNames.push(previous.className)
        return
      }
      const jjClassNames: string[] = []
      const globalClassName = getPropClassNameValue(
        propValue,
        globalProps[propKey]
      )
      if (globalClassName) {
        jjClassNames.push(globalClassName)
      }
      const ownClassName = getPropClassNameValue(
        propValue,
        cData.props[propKey]
      )
      if (ownClassName) {
        jjClassNames.push(ownClassName)
      }
      const parentLegacyClassName = (cData.legacy[propKey]?.parentNames || [])
        .map((parent) => {
          const parentLegacy = componentsData[parent]?.props?.[propKey]
          return getPropClassNameValue(propValue, parentLegacy)
        })
        .join(' ')

      if (parentLegacyClassName) {
        jjClassNames.push(parentLegacyClassName)
      }
      const jjCN = jjClassNames.join(' ')

      previousClassNamesRef.current[propKey] = { propValue, className: jjCN }

      classNames.push(jjCN)
    })

    return classNames.join(' ').trim()
  }

  const createComponentElement = <Props,>(componentName: string) => {
    const propsKeys = getComponentPropsKeys(componentName)
    const emptyCssProps = propsKeys.reduce((acc, key) => {
      acc[key] = undefined
      return acc
    }, {})

    const devDebugPrefix = options?.devDebugPrefix ?? 'S.'

    /**
     * @description CSSComponent
     */
    const CSSComponent = React.forwardRef(function (props: any, ref) {
      const { $as = 'div', children, ...rest } = props
      const classNamesRef = React.useRef({ ...emptyCssProps })
      const className = getComponentActiveClassNames(
        props,
        componentName as string,
        propsKeys,
        classNamesRef
      )

      const tag = typeof $as === 'string' ? $as : 'tag' in $as ? $as.tag : $as
      const suffix =
        typeof $as === 'string' || 'displayName' in $as ? '' : `.${tag}`
      const Element = tag

      const dataProps = IS_DEV
        ? { 'data-kts-name': `${devDebugPrefix}${componentName}${suffix}` }
        : {}

      return (
        <Element
          {...dataProps}
          {...rest}
          {...emptyCssProps}
          className={className}
          ref={ref}
        >
          {children}
        </Element>
      )
    })

    CSSComponent.displayName = `${devDebugPrefix}${componentName}`
    return addHTMLTags<Props>(CSSComponent as any)
  }

  return createComponentElement
}

export const toRCC = (
  style: any,
  options: { devDebugPrefix?: string } = {}
) => {
  const createRCC = createRccHelper(style, options)

  const search = Object.keys(style).join('\n') // multilines
  const componentsKeys = findComponentKeys(search)

  return Object.keys(componentsKeys).reduce((prev: any, componentName: any) => {
    prev[componentName] = createRCC<any>(componentName)
    return prev
  }, {}) as {
    [key: string]: RCC<any> & {
      [K in keyof JSX.IntrinsicElements]: TaggedRCC<Omit<any, '$as'>, K>
    }
  }
}
