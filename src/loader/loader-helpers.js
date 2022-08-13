const fs = require('fs')
const path = require('path')
const sass = require('sass')

function addParsedClassNameData(className, components) {
  const [cn, ...propsKeys] = className.split('--')
  const componentName = cn || 'GlobalClass'

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

  if (componentName.includes('-')) {
    delete components[componentName]
    console.warn(
      `component name cannot contain dashes: ${componentName} will be ignored`
    )
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
      const $prop = `$${ternaryKey}`
      const prevValues = componentProps[$prop] || ''
      const separator = prevValues ? ' | ' : ''
      componentProps[$prop] = `${prevValues}${separator}'${ternaryValue}'`
      //  classNamesPropsMapping helper
      classNamesPropsMapping[$prop] = classNamesPropsMapping[$prop] || {}

      classNamesPropsMapping[$prop][ternaryValue] = memoKey
    } else {
      const $prop = `$${propKey}`
      componentProps[$prop] = 'boolean'
      classNamesPropsMapping[$prop] = memoKey
    }
    classNamesMemo.add(memoKey)
  })
}

function createStringContent(arr = [], separator = '\n') {
  return arr.join(separator)
}

function createStyleType(className, prevContent = '') {
  const [root] = className.split('--')
  if (
    className !== '--DEFAULT' &&
    !className.includes('_ext_') &&
    !root.includes('-')
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
      .map((extName) => `${extName}Props`)
      .join(', ')
    if (extensionString.trim()) {
      extensionString = `extends ${extensionString} `
    }
    const lastNewLine = propsContent ? '\n' : ''
    const firstNewLine = prevInterfaceDef ? '\n\n' : ''
    return `${prevInterfaceDef}${firstNewLine}export interface ${componentName}Props ${extensionString}{${propsContent}${lastNewLine}}`
  }, '')
}

function getClassNamesFromCssString(cssString) {
  return Array.from(
    new Set(
      cssString.match(/(?<=\.)((?!\.|:|\/|,|\{|\(|\)|\}|\[|\]|\s).)+/gim) || []
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
  const propsContent = Object.entries(props).reduce((prevProps, propEntry) => {
    const [propKey, propType] = propEntry
    const newLine = '\n  '
    const quoteKey = propKey.includes('-') ? `"${propKey}"` : propKey
    return `${prevProps}${newLine}${quoteKey}?: ${propType};`
  }, '')
  return propsContent
}

function getCssString(content, options) {
  const cssString = sass.compileString(content, options.sassOptions || {}).css
  const cleanedCssString = cssString
    // removing new lines but only if not followed by a dot
    .replaceAll(/(\r\n|\r|\n)(?!\.)/gi, ' ')
    // removing comments // or /* */
    .replaceAll(/\/\*.*\*\/|\/\/.*/gi, '')
    // removing attributes
    .replaceAll(/\{.*\}/gi, ',')
  return cleanedCssString
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

function getExportStyleOnly(resource, options) {
  const { exportStyleOnly = false } = options
  if (typeof exportStyleOnly === 'function') {
    const paths = resource.split('/')
    const fileName = paths.pop()
    return exportStyleOnly(fileName, paths.join('/'))
  }
  return exportStyleOnly
}

function getHasGlobalProps(components) {
  return !!Object.keys(components.GlobalClass?.props ?? {}).length
}

function getHasLegacyProps({ options, components, root, treeKeys = [root] }) {
  if (new Set(treeKeys).size !== treeKeys.length) {
    console.log(`\nrecursive extensions in ${options._resource}`)
    console.error(`recursive extensions: ${treeKeys.join(' ==> ')}\n`)
    return true
  }
  const componentData = getComponentByName(components, root)
  if (!componentData) {
    return false
  }
  const { extensions } = componentData
  const parentsArr = Array.from(extensions)
  const hasLegacyProps = parentsArr.some(
    (parentName) =>
      getHasLegacyProps({
        components,
        root: parentName,
        treeKeys: [...treeKeys, parentName],
        options
      }) || getHasOwnProps(components, parentName)
  )
  return hasLegacyProps
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
  const paths = resource.split('/')
  const fileName = paths.pop()
  if (options.getOutputFileName) {
    return options.getOutputFileName(fileName, paths.join('/'))
  }
  const newFileName = fileName.replace(/(\.module)?\.(c|le|scss|sass)/g, '.rcc')
  return newFileName
}

const DEFAULT_CACHE_FOLDER = '.rcc-tmp'

function getShouldCompileFromCache({ classNames, options, resource, rootDir }) {
  if (options.cache?.disabled) {
    // will always compile and not cache result
    return true
  }
  const filePaths = resource.replace(`${rootDir}/`, '').split('/')
  const resourceName = filePaths.pop()
  const cacheFileName = `${getNewFileName(resource, options)}.rcc.json`
  const tmpFolder = options.cache?.folder ?? DEFAULT_CACHE_FOLDER

  const outputFileName = options._outputFileName
  // const fileFolder = `${rootDir}/${tmpFolder}/rcc-cache/${filePaths.join("/")}`;
  const cacheFileFolder = path.resolve(
    rootDir,
    tmpFolder,
    'rcc-cache',
    filePaths.join('/')
  )
  const cacheFilePath = `${cacheFileFolder}/${cacheFileName}`
  const { exportStyleOnly = false } = options

  if (fs.existsSync(cacheFilePath)) {
    const tmpFileString = fs.readFileSync(cacheFilePath, 'utf8')
    const oldTmpObject = JSON.parse(tmpFileString)
    const oldKeys = oldTmpObject.classNames.join(' ')
    const newKeys = classNames.join(' ')
    const isOutputFileNameEqual = oldTmpObject.outputFileName === outputFileName
    const isExportStyleOnlySame =
      oldTmpObject.exportStyleOnly === exportStyleOnly
    if (isOutputFileNameEqual && isExportStyleOnlySame && oldKeys === newKeys) {
      return false
    }

    if (oldTmpObject.outputFileName && !isOutputFileNameEqual) {
      const oldFilePath = `${cacheFileFolder}/${oldTmpObject.outputFileName}.rcc.tsx`
      if (fs.existsSync(oldFilePath)) {
        // delete old output .rcc.tsx file
        fs.unlink(oldFilePath)
      }
    }
  } else if (!fs.existsSync(`${cacheFileFolder}/`)) {
    fs.mkdirSync(cacheFileFolder, { recursive: true })
  }

  const cacheData = { classNames, outputFileName, exportStyleOnly }
  fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData))
  console.log(resourceName, 'should compile ==', true)
  return true
}

module.exports = {
  addParsedClassNameData,
  createStringContent,
  createStyleType,
  getClassInterfacesDefinition,
  getClassNamesFromCssString,
  getComponentByName,
  getComponentPropertiesDef,
  getCssString,
  getEmptyComponentData,
  getExportStyleOnly,
  getHasGlobalProps,
  getHasLegacyProps,
  getHasOwnProps,
  getNewFileName,
  getShouldCompileFromCache
}
