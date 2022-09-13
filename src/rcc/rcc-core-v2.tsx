import React from 'react'
import { ComponentData, RCC, TaggedRCC } from '../typings'
import { addHTMLTags } from '../rcc/addHTMLTags'
import {
  checkRecursiveExtensions,
  findComponentKeys,
  findComponentPropsMap
} from './regex-helper'

const IS_DEV = process.env.NODE_ENV === 'development'

export const createRccHelper = <S extends Record<string, any>>(
  style: S,
  options?: { devDebugPrefix?: string }
) => {
  const search = Object.keys(style).join('\n') // multilines

  const componentsData = {} as { [ComponentName: string]: ComponentData }
  const globalProps = {} as { [$props: string]: string }
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
      const [, ternaryName] = dirtyProp.split('_as_')
      const $prop = `$${ternaryName}`
      globalProps[$prop] = className.replace(ternaryName, '[?]')
    } else {
      const $prop = `$${dirtyProp}`
      globalProps[$prop] = className
    }
  })

  Object.keys(componentsKeys).forEach((componentName) => {
    const propsClassesMap = findComponentPropsMap(search, componentName)
    const nthComponentPropClassMapping = {}

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
        const [, ternaryName] = dirtyProp.split('_as_')
        const $prop = `$${ternaryName}`
        nthComponentPropClassMapping[$prop] = className.replace(
          ternaryName,
          '[?]'
        )
      } else {
        const $prop = `$${dirtyProp}`
        nthComponentPropClassMapping[$prop] = className
      }
    })

    const { extensions } = componentsKeys[componentName]

    componentsData[componentName] = {
      extensions,
      propClassMapping: nthComponentPropClassMapping,
      legacy: {}
    }
    /*
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
    })*/
  })

  try {
    Object.keys(componentsData).forEach((componentName) => {
      checkRecursiveExtensions(componentName, componentsData)
    })
  } catch (e) {
    console.error(e)
    throw e
  }

  const addLegacy = (componentName: string, parentName: string) => {
    const childData = componentsData[componentName]
    const parentData = componentsData[parentName]
    Object.keys(parentData.propClassMapping).forEach(($prop) => {
      childData.legacy[$prop] = childData.legacy[$prop] || []
      childData.legacy[$prop].push(parentName)
    })
    parentData.extensions.forEach((ext) => {
      addLegacy(componentName, ext)
    })
  }
  Object.keys(componentsData).forEach((componentName) => {
    const childData = componentsData[componentName]

    childData.extensions.forEach((parentName) =>
      addLegacy(componentName, parentName)
    )
  })

  const getComponentPropsKeys = (componentName: string) => {
    const ccData = componentsData[componentName]
    if (!ccData) {
      // console.log('empty props for component', componentName)
      return []
    }

    const globalKeys = Object.keys(globalProps)
    const ownKeys = Object.keys(ccData.propClassMapping)
    const legacyKeys = Object.keys(ccData.legacy)
    const propsKeys = Array.from(
      new Set([...globalKeys, ...legacyKeys, ...ownKeys])
    )

    return propsKeys
  }

  const getClassNameByPropKey = (
    propClassMapping: { [$prop: string]: string },
    $prop: string,
    propValue?: boolean | string
  ): string => {
    if (!propValue) return ''
    const classKey = propClassMapping[$prop].replace('[?]', '' + propValue)
    return style[classKey] ?? ''
  }

  const getComponentActiveClassNames = (
    props: any,
    componentName: string,
    propsKeys: string[],
    previousClassNamesRef: React.MutableRefObject<{
      [PropKey: string]: { propValue: string; className: string }
    }>
  ) => {
    const ref = previousClassNamesRef
    const classNames: string[] = []
    const ownClass = style[componentName]

    // I should move this one out
    !!ownClass && classNames.push(ownClass)
    !!defaultClassName && classNames.push(defaultClassName)
    //
    !!props.className && classNames.push(props.className)

    const cData = componentsData[componentName]

    if (!cData) return ''

    return propsKeys.reduce((prevClassName, $prop) => {
      const propValue = props[$prop]
      if (ref.current[$prop]?.propValue === propValue) {
        const className = ref.current[$prop]?.className || ''
        return prevClassName + ' ' + className
      }
      const cnLegacy = (cData.legacy[$prop] || []).reduce(
        (prevClassNameLegacy, parent) => {
          const mapping = componentsData[parent]?.propClassMapping || {}
          const classNameLegacy = getClassNameByPropKey(
            mapping,
            $prop,
            propValue
          )
          return classNameLegacy
            ? prevClassNameLegacy + ' ' + classNameLegacy
            : prevClassNameLegacy
        },
        ''
      )
      const globalClassName = getClassNameByPropKey(
        globalProps,
        $prop,
        propValue
      )
      const ownClassName = getClassNameByPropKey(
        cData.propClassMapping,
        $prop,
        propValue
      )
      const className = [prevClassName, ownClassName, cnLegacy, globalClassName]
        .join(' ')
        .trim()
        .replace(/\s+/, ' ')
      ref.current[$prop] = { propValue, className }
      return className
    }, classNames.join(' '))
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
