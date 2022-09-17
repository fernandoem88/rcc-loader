const fs = require('fs')
const path = require('path')

const pathSeparator = path.sep

function addParsedClassNameData(className, components) {
  const [cn, ...propsKeys] = className.split('--')
  const componentName = cn || 'GlobalClasses'

  if (componentName.includes('_ext_')) {
    const [childName, parentName] = componentName.split('_ext_')

    components[childName] = components[childName] || {
      ...getEmptyComponentData()
    }

    const { extensions } = components[childName]

    components[parentName] = components[parentName] || {
      ...getEmptyComponentData()
    }

    extensions.add(parentName)
    return
  }

  components[componentName] = components[componentName] || {
    ...getEmptyComponentData()
  }

  const {
    props: componentProps,
    classNamesMemo,
    classNamesPropsMapping
  } = getComponentByName(components, componentName)

  let memoKey = cn || ''

  propsKeys.forEach((propKey) => {
    memoKey += `--${propKey}`

    const isTernary = propKey.includes('_as_')
    if (propKey === 'DEFAULT' || classNamesMemo.has(memoKey)) {
      // don't do nothing
    } else if (isTernary) {
      const [ternaryValue, ternaryKey] = propKey.split('_as_')
      const $prop = toCamelCase(ternaryKey)
      const prevValues = componentProps[$prop] || ''
      const separator = prevValues ? ' | ' : ''
      componentProps[$prop] = `${prevValues}${separator}'${ternaryValue}'`
      //  classNamesPropsMapping helper
      classNamesPropsMapping[$prop] = classNamesPropsMapping[$prop] || {}

      classNamesPropsMapping[$prop][ternaryValue] = memoKey
    } else {
      const $prop = toCamelCase(propKey)
      componentProps[$prop] = 'boolean'
      classNamesPropsMapping[$prop] = memoKey
    }
    classNamesMemo.add(memoKey)
  })
}

function cleanCssString(cssString) {
  const separator = '_-||-_'
  const cleanedCssString = cssString
    // replace all new lines new lines with a special separator
    .replaceAll(/(\r\n|\r|\n)/gi, separator)
    // removing block comments /* */
    .replaceAll(/\/\*.*\*\//gi, '')
    // removing css attributes
    .replaceAll(/\{.[^}]*\}/gi, ',')
    // restore new line for .classes
    .replaceAll(separator, '\n')
    // removing inline comments //
    .replaceAll(/\/\/.*/gi, '')

  return cleanedCssString
}

function createStringContent(arr = [], separator = '\n') {
  return arr.join(separator)
}

// css module types
function createStyleType(className, prevContent = '') {
  const [root] = className.split('--')
  if (
    className !== '--DEFAULT' &&
    !className.includes('_ext_')
    // && !root.includes('-')
  ) {
    const styleKey = className.includes('-') ? `"${className}"` : className
    const separator = prevContent ? '\n  ' : ''
    return `${prevContent}${separator}${styleKey}: string;`
  }
  return prevContent
}

function getClassInterfacesDefinition(components) {
  return Object.entries(components).reduce((prevInterfaceDef, entry) => {
    const [componentName, componentData] = entry
    const { props, extensions, classNamesPropsMapping, hasProps } =
      componentData

    if (!hasProps) return prevInterfaceDef

    const propsContent = getComponentPropertiesDef(
      props,
      classNamesPropsMapping
    )

    let extensionString = Array.from(extensions)
      .filter((ext) => !!components[ext]?.hasProps)
      .map((extName) => `${toKebabCase(extName)}Props`)
      .join(', ')
    if (extensionString.trim()) {
      extensionString = `extends ${extensionString} `
    }
    const lastNewLine = propsContent ? '\n' : ''
    const firstNewLine = prevInterfaceDef ? '\n\n' : ''
    return `${prevInterfaceDef}${firstNewLine}export interface ${toKebabCase(
      componentName
    )}Props ${extensionString}{${propsContent}${lastNewLine}}`
  }, '')
}

function getClassNamesFromCssString(cssString) {
  const cleanedCssString = cleanCssString(cssString)
  return Array.from(
    new Set(
      cleanedCssString.match(
        /(?<=\.)((?!\.|:|\/|,|\{|\(|\)|\}|\[|\]|\s).)+/gim
      ) || []
    )
  ).sort()
}

function getComponentByName(components, componentName) {
  const component = components[componentName]
  if (!component) {
    console.warn(`component "${componentName}" does not exist`)
  }
  return component || getEmptyComponentData()
}

function getComponentPropertiesDef(props, classNamesPropsMapping) {
  const propsContent = Object.entries(props)
    .map((propEntry) => {
      const [propKey, propType] = propEntry
      const camelCaseProp = toCamelCase(propKey)
      return `\n  ${camelCaseProp}?: ${propType};`
    })
    .join('')
  return propsContent
}

function getEmptyComponentData() {
  return {
    props: {},
    extensions: new Set([]),
    // to help avoiding props duplications in the component interface
    classNamesMemo: new Set([]),
    // { "$props-key": "Component--class-name" }
    classNamesPropsMapping: {},
    hasProps: false
  }
}

function getDevDebugPrefix(resource, options) {
  const { devDebugPrefix = 'S.' } = options
  if (typeof devDebugPrefix === 'function') {
    const paths = resource.split(pathSeparator)
    const fileName = paths.pop()
    return devDebugPrefix(fileName, paths.join(pathSeparator))
  }
  return devDebugPrefix
}

function getExportTypes(resource, options) {
  const { exports = {} } = options
  if (typeof exports === 'function') {
    const paths = resource.split(pathSeparator)
    const fileName = paths.pop()
    const { rcc = true, style = false } = exports(
      fileName,
      paths.join(pathSeparator)
    )
    return { rcc, style }
  }
  const { rcc = true, style = false } = exports
  return { rcc, style }
}

function getHasGlobalProps(components) {
  return !!Object.keys(components.GlobalClasses?.props ?? {}).length
}

function getHasProps({ root, options, components, treeKeys = [root] }) {
  const componentData = getComponentByName(components, root)
  if (!componentData) {
    return false
  }
  const { extensions } = componentData
  const parentsArr = Array.from(extensions)
  const hasProps =
    getHasOwnProps(components, root) ||
    parentsArr.some((parentName) =>
      getHasProps({
        components,
        root: parentName,
        treeKeys: [...treeKeys, parentName],
        options
      })
    )
  return hasProps
}

function getRecursiveErrorMessage({
  options,
  components,
  root,
  treeKeys = [root]
}) {
  const { _resource } = options
  if (new Set(treeKeys).size !== treeKeys.length) {
    const errMsg1 = `recursive extensions in ${_resource.replace('\\', '/')}`
    const loop = treeKeys.join(' ==> ')
    const errorMsg = createStringContent([
      `import { toRCC } from "rcc-loader/dist/rcc-core"`,
      `import _style from "${_resource.replace('\\', '/')}"`,
      `\n// 1: Change your classes definition to avoid the following infinite loop:`,
      `// ${loop}`,
      `const errorMsg = "${errMsg1}"`,
      `console.error(errorMsg)`,
      '\n// 2: once done, remove the following line',
      `throw new Error(errorMsg)`,
      '\nexport const style = _style as any',
      '\nexport default toRCC(_style as any)'
    ])

    throw new Error(errorMsg)
  }
  const componentData = getComponentByName(components, root)
  if (!componentData) {
    return
  }
  const { extensions } = componentData
  const parentsArr = Array.from(extensions)
  const errorMessage = parentsArr.some((parentName) =>
    getRecursiveErrorMessage({
      components,
      root: parentName,
      treeKeys: [...treeKeys, parentName],
      options
    })
  )
  return errorMessage
}

function getHasOwnProps(components, componentName) {
  const componentProps =
    getComponentByName(components, componentName)?.props || {}
  return !!Object.keys(componentProps).length
}

/**
 *
 * @param {*} resource file resource path with extension
 * @param {*} options loader options
 * @returns new file name without extension
 */
function getNewFileName(resource, options) {
  const paths = resource.split(pathSeparator)
  const fileName = paths.pop()
  if (options.getOutputFileName) {
    return options.getOutputFileName(fileName, paths.join(pathSeparator))
  }
  const newFileName = fileName.replace(
    /(\.module)?\.(css|less|scss|sass)/g,
    '.rcc'
  )
  return newFileName
}

function getShouldCompileFromHash({ classNames, options, resource, rootDir }) {
  const esoHash = options._exportable.style ? '#stl_expo; ' : ''
  const rccHash = options._exportable.rcc ? '#rcc_expo; ' : ''
  const cnHash = `#cn=${classNames.join('|')};`
  const outputFilenameHash = `#ofn=${options._outputFileName};`
  const newHash = `##hash## ${rccHash}${esoHash}${cnHash}${outputFilenameHash}`
  if (fs.existsSync(options._outputFilePath)) {
    const fileContent = fs.readFileSync(options._outputFilePath, 'utf8')
    const oldHash = fileContent
      .replaceAll(/(\r\n|\r|\n)/gi, '')
      .replace(/.*##hash##/g, '##hash##')
    return [oldHash !== newHash, newHash]
  }
  return [true, newHash]
}

const toKebabCase = (str) =>
  str.replace(/^[a-z0-9]|-[a-z0-9]/g, (match) =>
    match.toUpperCase().replace('-', '')
  )

const toCamelCase = (str) =>
  str.replace(/-[a-z0-9]/g, (match) => match.toUpperCase().replace('-', ''))

module.exports = {
  addParsedClassNameData,
  cleanCssString,
  createStringContent,
  createStyleType,
  getClassInterfacesDefinition,
  getClassNamesFromCssString,
  getComponentByName,
  getComponentPropertiesDef,
  getDevDebugPrefix,
  getEmptyComponentData,
  getExportTypes,
  getHasGlobalProps,
  getRecursiveErrorMessage,
  getHasProps,
  getHasOwnProps,
  getNewFileName,
  getShouldCompileFromHash,
  toKebabCase
}
