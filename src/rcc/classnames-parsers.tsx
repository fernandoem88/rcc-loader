// return a dictionary of component keys which value is its extensions array
export const findComponentKeys = (globalSearch: string) => {
  const componentsKeys: { [K: string]: { extensions: string[] } } = {}
  // starts with a-Z,
  // not contains double dashes (zero or more) or is before double dashes
  const reg = /^[a-z]((?!--|_ext_).)*(?=--|_ext_)?/gim

  globalSearch.replace(reg, (...args) => {
    const [componentName] = args

    if (!componentsKeys[componentName]) {
      const extRegex = new RegExp(
        // `(?<=^${componentName}_ext_).+?(?=(--.+)*$)`,
        `(?<=^${componentName}_ext_)((?!--|_ext_).)+$`,
        'gim'
      )
      const extensions = globalSearch.match(extRegex) || []
      componentsKeys[componentName] = { extensions }
    }
    return ''
  })

  return componentsKeys
}

const toCamelCase = (str: string) =>
  str.replace(/-[a-z0-9]/g, (match) => match.toUpperCase().replace('-', ''))

/**
 *
 * @param globalSearch
 * @param component
 * @returns
 *
 * @example // example of a returned map
 * const RootClassesMap = {
 *  red_as_color: 'Root--red_as_color',
 *   green_as_color: 'Root--green_as_color',
 *   yellow_as_color: 'Root--yellow_as_color',
 *   'dark-yellow': 'Root--yellow_as_color--dark-yellow',
 *   'sub-dark-yellow': 'Root--yellow_as_color--dark-yellow--sub-dark-yellow',
 *   'border-radius': 'Root--border-radius'
 * }
 */
export const findComponentPropsMap = (
  globalSearch: string,
  component: string
) => {
  // ($0 = starts with Component--) ($1 = maybe some string with double dashes) ($2 = ends with property part)
  // const reg = new RegExp(`(?<=${component}--)(.+--)*(.+)$`, "gm");
  const reg = new RegExp(`^(${component}--)(.+--)*(.+)$`, 'gm')

  const propsMap: { [$prop: string]: string } = {}

  globalSearch.replace(reg, (...classParts) => {
    const [, prefix, mainClass = '', suffix] = classParts
    const [tValue, tProp] = suffix.split('_as_')
    const isTernary = suffix.indexOf('_as_') !== -1
    const $prop = isTernary ? tProp : suffix
    const placeholder = isTernary ? suffix.replace(tValue, '[?]') : suffix
    propsMap[toCamelCase($prop)] = `${prefix}${mainClass}${placeholder}`
    return ''
  })

  return propsMap
}

export const checkRecursiveExtensions = (
  root: string,
  components: { [key: string]: { extensions: string[] } },
  treeKeys: string[] = [root]
) => {
  const { extensions } = components[root]

  if (new Set(treeKeys).size !== treeKeys.length) {
    const errMsg = `\nERROR - recursive extensions: ${treeKeys.join(
      ' extends '
    )}\n`
    throw new Error(errMsg)
  }
  extensions.forEach((parentName) => {
    checkRecursiveExtensions(parentName, components, [parentName, ...treeKeys])
  })
  return true
}
