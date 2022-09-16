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

  const { rcc: exportableRCC, style: exportableStyle } = options._exportable

  if (!exportableRCC && !exportableStyle) {
    return
  }

  console.log('\n\n exportable', options._exportable)

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
    return utils.fs.writeFileSync(
      options._outputFilePath,
      `${error.message}\n\n// ${hashTag}`
    )
  }

  const hasGlobalProps = helpers.getHasGlobalProps(components)
  components.GlobalClasses.hasProps = hasGlobalProps

  const styleContent = exportableStyle
    ? helpers.createStringContent([
        '\n\nexport interface ModuleStyle {',
        `  ${styleModuleType}`,
        '};',
        '\nexport const style: ModuleStyle = _style as any;'
      ])
    : ''

  const rccComponentsImplementation = !exportableRCC
    ? ''
    : Object.entries(components).reduce((prev, entry) => {
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

        const ownTypeDefinition = hasProps ? `${componentName}Props` : '{}'
        const gcpPropDefinition =
          hasProps && hasGlobalProps
            ? `GCP & ${ownTypeDefinition}`
            : hasGlobalProps
            ? 'GCP'
            : ownTypeDefinition
        const jjContent = `${separator}${componentName}: RCC<${gcpPropDefinition}>`

        return `${prev}${jjContent}`
      }, '')

  const gcpTypeDef =
    hasGlobalProps && exportableRCC ? '\n\ntype GCP = GlobalClassesProps;' : ''

  const componentsPropsDefinition = exportableRCC
    ? '\n' + helpers.getClassInterfacesDefinition(components)
    : ''

  const rccSeparator = !!componentsPropsDefinition || !!gcpTypeDef ? '\n' : ''

  const rccContent = exportableRCC
    ? helpers.createStringContent([
        `${rccSeparator}${componentsPropsDefinition}${gcpTypeDef}`,
        '\nconst cssComponents = toRCC(_style) as {',
        `  ${rccComponentsImplementation}`,
        '};',
        '\nexport default cssComponents;'
      ])
    : ''

  const rccImport = exportableRCC
    ? `import { toRCC, RCC } from 'rcc-loader/dist/rcc-core';\n`
    : ''

  const styleImport = `import _style from "./${resourceFileName}";`

  return utils.fs.writeFileSync(
    options._outputFilePath,
    `${rccImport}${styleImport}${styleContent}${rccContent}\n\n// ${hashTag}`
  )
}

module.exports = rccLoader
