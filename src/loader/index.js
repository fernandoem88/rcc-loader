const fs = require('fs')
const path = require('path')
const sass = require('sass')

const helpers = require('./loader-helpers')

const pathSeparator = path.sep

const utils = { fs, path }

function rccLoader(content, map, meta) {
  const options = this.getOptions()

  if (!options.enabled) return

  const paths = this.resource.split(pathSeparator)
  const resourceFileName = paths.pop()

  options._getFSModule = () => this.fs
  options._resource = this.resource.replace(this.rootContext, '.')
  options._outputFileName = helpers.getNewFileName(this.resource, options)
  options._logger = this.getLogger()

  options._outputFilePath = utils.path.resolve(
    paths.join(pathSeparator),
    `${options._outputFileName}.tsx`
  )

  options._devDebugPrefix = helpers.getDevDebugPrefix(this.resource, options)

  const exportStyleOnly = helpers.getExportStyleOnly(this.resource, options)

  const cssString = sass.compileString(content, options.sassOptions || {}).css
  const classNamesArray = helpers.getClassNamesFromCssString(cssString)

  const [shouldCompile, hashTag] = helpers.getShouldCompileFromHash({
    classNames: classNamesArray,
    rootDir: this.rootContext,
    resource: this.resource,
    options
  })

  if (!shouldCompile) return

  const components = { GlobalClass: helpers.getEmptyComponentData() }

  let styleModuleType = ''
  classNamesArray.forEach((className) => {
    styleModuleType = helpers.createStyleType(className, styleModuleType)
    if (!exportStyleOnly) {
      helpers.addParsedClassNameData(className, components)
    }
  })

  try {
    Object.keys(components).forEach((root) =>
      helpers.getRecursiveErrorMessage({ options, root, components })
    )
  } catch (error) {
    return utils.fs.writeFileSync(options._outputFilePath, `${error.message}`)
  }

  const hasGlobalProps = helpers.getHasGlobalProps(components)
  components.GlobalClass.hasProps = hasGlobalProps

  const styleContent = helpers.createStringContent([
    '\n\nexport interface ModuleStyle {',
    `  ${styleModuleType}`,
    '};',
    '\nexport const style: ModuleStyle = _style as any;\n'
  ])

  const rccComponentsImplementation = exportStyleOnly
    ? ''
    : Object.entries(components).reduce((prev, entry) => {
        const [componentName, componentData] = entry
        if (componentName === 'GlobalClass') {
          return prev
        }

        const separator = prev ? ',\n  ' : ''

        const hasProps = helpers.getHasOwnProps(components, componentName)
        // updating component Data with hasProps
        componentData.hasProps = hasProps

        const ownTypeDefinition = hasProps ? `${componentName}Props` : '{}'
        const gcpPropDefinition = hasGlobalProps
          ? `GCP<${ownTypeDefinition}>`
          : ownTypeDefinition
        const jjContent = `${separator}${componentName}: createRCC<${gcpPropDefinition}>("${componentName}")`

        return `${prev}${jjContent}`
      }, '')

  const gcpTypeDef = hasGlobalProps
    ? '\n\ntype GCP<T> = T & GlobalClassProps;'
    : ''

  const componentsPropsDefinition = exportStyleOnly
    ? ''
    : helpers.getBaseComponentsDefinition(components)

  const rccSeparator = !!componentsPropsDefinition || !!gcpTypeDef ? '\n' : ''

  const rccContent = exportStyleOnly
    ? ''
    : helpers.createStringContent([
        `${rccSeparator}${componentsPropsDefinition}${gcpTypeDef}`,
        'const createRCC = createRccHelper(style, {',
        `  devDebugPrefix: "${options._devDebugPrefix}"`,
        '});',
        '\nconst cssComponents = {',
        `  ${rccComponentsImplementation}`,
        '};',
        '\nexport default cssComponents;'
      ])

  const rccImport = exportStyleOnly
    ? ''
    : `import { createRccHelper } from 'rcc-loader/dist/rcc-core';\n`

  const styleImport = `import _style from "./${resourceFileName}";`

  return utils.fs.writeFileSync(
    options._outputFilePath,
    `${rccImport}${styleImport}${styleContent}${rccContent}\n\n// ${hashTag}`
  )
}

module.exports = rccLoader
