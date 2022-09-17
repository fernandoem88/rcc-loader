import { ComponentProps, ElementType, Props } from 'react'
// import { StringOptions } from 'sass'

// export interface BaseOptions {
//   // enabled: (required) the loader should be enabled only in Dev environment.
//   // alternatively you can just, add the rccLoaderRule to webpack only in dev and set enabled to true by default
//   enabled: boolean
//   // cache: (optional) the cache folder by default is .rcc-tmp
//   // we should add it to the .gitignore file
//   cache?: {
//     folder: string // '.rcc-tmp'
//     // will always generate new rcc file without caching
//     disabled?: boolean
//   }
//   // exportStyleOnly: (optional), false by default. set it to true in case you want only to export the ModuleStyle from the generated file.
//   // you can use a function in case you want to set it only for given modules or name templates
//   // eg: { exportStyleOnly: (filename, fileDir) => /-eso\.module\.scss$/.test(filename)}
//   exportStyleOnly?: boolean | ((filename: string, fileDir: string) => boolean)
//   // getOutputFileName: (optional), to generate file with different name then the defualt one.
//   getOutputFileName?: (filename: string, fileDir: string) => string
//   // sassOptions: (optional) - sassOptions to pass to sass compiler
//   // => sass.compileString(content, sassOptions). for example to resolve absolute imports, etc.
//   sassOptions?: StringOptions<'sync'>
//   devDebugPrefix?: string | (finename: string, fileDir: string) => string
// }

// export interface Options extends BaseOptions {
//   _resource: string
//   _outputFileName: string
//   _outputFilePath: string
//   _logger: (...args: any) => any
// }

// export type LoaderComponents = { [key: string]: LoaderComponentData }

export interface LoaderComponentData {
  props: { [key: string]: any }
  extensions: Set<string>
  // to help avoiding props duplications in the component interface
  classNamesMemo: Set<string>
  // { "$props-key": "Component--class-name" }
  classNamesPropsMapping: { [key: string]: any }
  hasProps: boolean
}

export interface ComponentData {
  extensions: string[]
  propClassMapping: { [$prop: string]: string }
}

export type RCCElement<Props, Tag extends ElementType = 'div'> = (
  props: { $cn?: Props } & ComponentProps<Tag>
) => JSX.Element

export type RCC<Props> = {
  [K in keyof JSX.IntrinsicElements]: RCCElement<Props, K>
}
