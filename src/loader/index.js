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

  options._exportable = helpers.getExportTypes(this.resource, options)

  const {
    rcc: exportableRCC,
    style: exportableStyle,
    $cn: exportableCN
  } = options._exportable

  if (!exportableRCC && !exportableStyle && !exportableCN) {
    return content
  }

  options._getFSModule = () => this.fs
  options._resource = this.resource.replace(this.rootContext, '.')
  options._outputFileName = helpers.getNewFileName(this.resource, options)
  options._logger = this.getLogger()

  options._outputFilePath = utils.path.resolve(
    paths.join(pathSeparator),
    `${options._outputFileName}.tsx`
  )

  const cssString = sass.compileString(content, options.sassOptions || {}).css
  const classNamesArray = helpers.getClassNamesFromCssString(cssString)

  const [shouldCompile, hashTag] = helpers.getShouldCompileFromHash({
    classNames: classNamesArray,
    rootDir: this.rootContext,
    resource: this.resource,
    options
  })

  if (!shouldCompile) return

  const components = { GlobalClasses: helpers.getEmptyComponentData() }

  let styleModuleType = ''
  classNamesArray.forEach((className) => {
    styleModuleType = helpers.createStyleType(className, styleModuleType)
    if (exportableRCC) {
      helpers.addParsedClassNameData(className, components)
    }
  })

  try {
    Object.keys(components).forEach((root) =>
      helpers.getRecursiveErrorMessage({ options, root, components, hashTag })
    )
  } catch (error) {
    utils.fs.writeFileSync(
      options._outputFilePath,
      `${error.message}\n\n// ${hashTag}`
    )
    return content
  }

  // const hasGlobalProps = helpers.getHasGlobalProps(components)
  components.GlobalClasses.hasProps = true // always with className

  const styleContent = exportableStyle
    ? helpers.createStringContent([
        '\n\nexport interface ModuleStyle {',
        `  ${styleModuleType}`,
        '};',
        '\nexport const style: ModuleStyle = _style as any;'
      ])
    : ''

  const getItemsDefinition = (type = 'RCC') => {
    return Object.entries(components).reduce((prev, entry) => {
      const [componentName, componentData] = entry
      if (componentName === 'GlobalClasses') {
        return prev
      }

      const separator = prev ? ';\n  ' : ''

      const hasProps = helpers.getHasProps({
        components,
        root: componentName,
        options
      })
      // updating component Data with hasProps
      componentData.hasProps = hasProps

      const ownTypeDefinition = hasProps
        ? `${helpers.toKebabCase(componentName)}Props`
        : '{}'
      const gcpPropDefinition = hasProps ? `GCP & ${ownTypeDefinition}` : 'GCP'

      const jjContent = `${separator}${helpers.toKebabCase(
        componentName
      )}: ${type}<${gcpPropDefinition}>`

      return `${prev}${jjContent}`
    }, '')
  }
  const rccNewLine = exportableCN ? '\n' : ''

  const rccComponentsImplementation = exportableRCC
    ? helpers.createStringContent([
        `${rccNewLine}const cssComponents = data.rccs as {`,
        `  ${getItemsDefinition('RCC')}`,
        '};',
        '\nexport default cssComponents;'
      ])
    : ''

  const $cnImplementation = exportableCN
    ? helpers.createStringContent([
        '\nexport const $cn = data.$cn as {',
        `  ${getItemsDefinition('CN')}`,
        '};'
      ])
    : ''

  const cnTtypeDef = exportableCN
    ? '\ntype CN<P> = (props?: P & GCP) => string;\n'
    : ''
  const gcpTypeDef =
    exportableRCC || exportableCN ? '\n\ntype GCP = GlobalClassesProps;' : ''

  const componentsPropsDefinition =
    exportableRCC || exportableCN
      ? '\n' + helpers.getClassInterfacesDefinition(components)
      : ''

  const rccSeparator =
    !!componentsPropsDefinition || !!gcpTypeDef || cnTtypeDef ? '\n' : ''

  const rccContent =
    exportableRCC || exportableCN
      ? helpers.createStringContent([
          `${rccSeparator}${componentsPropsDefinition}${gcpTypeDef}${cnTtypeDef}`,
          'const data = styleParser(_style);',
          $cnImplementation,
          rccComponentsImplementation
        ])
      : ''

  const rccImport = exportableRCC
    ? `import { styleParser, RCC } from 'rcc-loader/dist/rcc-core';\n`
    : ''

  const styleImport = `import _style from "./${resourceFileName}";`

  utils.fs.writeFileSync(
    options._outputFilePath,
    `${rccImport}${styleImport}${styleContent}${rccContent}\n\n// ${hashTag}`
  )
  return content
}

module.exports = rccLoader
