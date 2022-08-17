# React css components loader (rcc-loader)

[![NPM](https://img.shields.io/npm/v/rcc-loader.svg)](https://www.npmjs.com/package/rcc-loader)

> This loader is built to generate types from an imported css module and map its classes into react components in order to use props instead of classNames.
>
> - **fast classNames mapping**
> - **easy to debug in React dev tools**
> - **typed css module classNames**

## Example

let's suppose to have the following scss file _my-app.module.scss_

```scss
.Root {
  background: white;
  color: black;
  &--dark-mode {
    background: black;
    color: white;
  }
}

.Btn {
  border: solid 1px black;
  border-radius: 3px;
  cursor: pointer;
  /* _as_ is a special key to group classes to one unique property*/
  &--sm_as_size {
    font-size: 10px;
  }
  &--md_as_size {
    font-size: 12px;
  }
  &--lg_as_size {
    font-size: 14px;
  }
}

/* _ext_:  is a special key to tell that a component should extend another component behaviour. in the following case for example, .DeleteBtn will herit from .Btn */
.DeleteBtn,
.DeleteBtn_ext_Btn {
  background: red;
  color: white;
  &--disabled {
    pointer-events: none;
    background: gray;
  }
}
```

the loader will generate the following file _my-app.rcc.tsx_.

```tsx
import { createRccHelper } from 'rcc-loader/dist/rcc-core'
import _style from './my-app.module.scss'

export interface ModuleStyle {
  Root: string
  'Root--dark-mode': string
  Btn: string
  'Btn--sm_as_size': string
  'Btn--md_as_size': string
  'Btn--lg_as_size': string
  DeleteBtn: string
  'DeleteBtn--disabled': string
}

// set exportStyleOnly to true in the webpack config to export only the style
export const style: ModuleStyle = _style as any

export interface RootProps {
  '$dark-mode'?: boolean
}

export interface BtnProps {
  $size?: 'sm' | 'md' | 'lg'
}
// DeleteBtnProps extends BtnProps because we defined the class .DeleteBtn_ext_Btn
export interface DeleteBtnProps extends BtnProps {
  $disabled?: boolean
}

const createRCC = createRccHelper(style, {
  prefix: 'S.'
})

const cssComponents = {
  Root: createRCC<RootProps>('Root'),
  Btn: createRCC<BtnProps>('Btn'),
  DeleteBtn: createRCC<DeleteBtnProps>('DeleteBtn')
}

export default cssComponents
```

now we can use it in our main component _MyComponent.tsx_

```tsx
import S from './my-app.rcc'

const MyComponent = ({
  isDarkMode,
  isDeleteDisabled
}: {
  isDarkMode: boolean
}) => {
  return (
    // $as accepts html tags or react component
    <S.Root $as='div' $dark-mode={isDarkMode}>
      {/* if the browser supports proxy, we can directly define the html tag inline */}
      <S.Btn.button $size='sm'>I am a small button</S.Btn.button>
      <S.Btn.button $size='md'>I am a medium button</S.Btn.button>
      <S.DeleteBtn.button $size='lg' $disabled={isDeleteDisabled}>
        I am a large Delete button
      </S.DeleteBtn.button>
    </S.Root>
  )
}
```

## how to Install

```bash
npm i -S rcc-loader
```

## use and options

see default Configuration example with nextjs

```ts
const nextConfig = {
  // ...
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    const rccLoaderRule = {
      test: /\.module\.scss$/,
      use: [
        {
          loader: 'rcc-loader',
          options: {
            /**
             * enabled: (required) the loader should be enabled only in Dev environment.
             * alternatively you can just, add the rccLoaderRule to webpack only in dev and set enabled to true by default
            */
            enabled: !!dev && isServer,
            /**
             * exportStyleOnly: (optional: boolean | Function), false by default. set it to true in case you want only to export the ModuleStyle from the generated file.
             *  you can use a function in case you want to set it only for given modules or name templates
             * eg: (filename, fileDir) => /-eso\.module\.scss$/.test(filename)
             * in this case, my-style-eso.module.scss for example will export only the ModuleStyle type
            **/
            exportStyleOnly: false,
            // cache: (optional) the cache folder by default is .rcc-tmp
            // we should add the cache folder path to the .gitignore file
            // after each css module compilation, rcc-loader checks cache values to decide if it should generate a new .rcc.tsx file or not
            cache: {
              folder: '.rcc-tmp',
              /**
               * disabled: (Optional) - always generates new rcc file without checking the cache folder
               * */
              disabled: false
            },
            // getOutputFileName: (optional), to generate file with different name then the defualt one.
            getOutputFileName: (filename, fileDir) =>
              `awesomename-${filename.replace('.module.scss', '')}`,
            // sassOptions: (optional) - sassOptions to pass to sass compiler
            // => sass.compileString(cssString, sassOptions). for example to resolve absolute imports, etc.
            sassOptions: {}
            // devDebugPrefix: (optional: string | function) - for dev environment, dom elements will have a data-kts-name attribute that will help for a fast look up in the project files. the default devDebugPrefix is S.
            //let's assume we render <S.ContentWrapper.div /> in our project, the dom will have data-kts-name="S.ContentWrapper.div"
            // we can have a dynamic prefix corresponding to our css module file.
            // eg: (fileName, fileDir) => fileName.replace(".module.scss", ".")
            // in this case, if our module file name is Overlay.module.scss, we wil then have data-kts-name="Overlay.ContentWrapper.div". etc.
            devDebugPrefix: "S."
          }
        }
      ]
    }

    config.module.rules = config.module.rules ?? []
    config.module.rules.push(rccLoaderRule)

    return config
  }
}
```

after setting up the config, we will first use the **toRCC** transformer in our react component. for example in _MyComponent.tsx_

```tsx
import { toRCC } from 'rcc-loader/dist/rcc-core'
import style from './my-style.module.scss'

// S type is an index { [key: string]: RCC }
const S = toRCC(style)

export const MyComponent = () => {
  return <S.Root.div>Hello World</S.Root.div>
}
```

after running the project, the _my-style.rcc.tsx_ file will be generated automatically so we can import the rcc components directly from it.

```tsx
// here S is fully typed
import S from './my-style.rcc'

export const MyComponent = () => {
  return <S.Root.div>Hello World</S.Root.div>
}
```

# special class keys

## Component Class.

the rcc component comes from the root class definition. Each _component class_ should be defined in **PascalCase**.

```scss
// correct definition
.Root {
}
.Content {
}
.ItemWrapper {
}
// wrong definition
// the following classes will be ignored
.Content-Wrapper {
}
.-ContentWrapper {
}
```

## component property class

it should start with the component root name followed by double dashes. Each _component property_ should be written in **kebab-case** (eg: .Component--prop-one--prop-two)

```scss
.Wrapper {
  &--dark-mode {
    &--border-2x {
    }
  }
}
// the Wrapper component will then have 2 props
// $dark-mode: that comes from .Wrapper--dark-mode
// $border-2x: that comes from .Wrapper--dark-mode--border-2x
```

## global property class

defining _component property class_ without specifying the component name at the begining of the class, the generated class will be available for all components in the rcc file

```scss
.--flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.--font-size-lg {
  font-size: 18px;
}

.Wrapper {
}
.Item {
}
// the Wrapper and the Item component will both have the global props
// $flex-center and $font-size-lg
```

## ternary property class

some times we define a bunch of classes and want to use only one at the time excluding other ones: A or B or C. to do so, we need to use the special key _**as**_

```scss
.--sm_as_font-size {
  font-size: 12px;
}

.--lg_as_font-size {
  font-size: 18px;
}

.Btn {
  &--red_as_color {
    color: green;
  }
  &--yellow_as_color {
    color: yellow;
  }
}

// global ternary props
// $font-size: 'sm' | 'lg'

// Btn component own props
// $color: 'green' | 'yellow'
```

## Component class extension

some time we just want to extends a class and overwrite other css properties. in this case, we should use the _**ext**_ key.

```scss
.Btn {
  border-radius: 3px;
  box-shadow: 4px 4px grey;
}

.PrimaryBtn,
.PrimaryBtn_ext_Btn {
  background: green;
  color: white;
}
// PrimaryBtn_ext_Btn tells us that the PrimaryBtn we just defined should extend the Btn previously defined
```

Note: recursive extensions will throw an error to avoid infinte loop

```scss
.Btn_ext_PrimaryBtn {
}

.PrimaryBtn_ext_Btn {
}

// Btn extends PrimaryBtn and PrimaryBtn extends Btn. this will create an infinite loop
```

## default css properties

if for some reason, we want to have some default props for all components in the rcc context, we can use the **--DEFAULT** key.

```scss
.--DEFAULT {
  font-family: 'Times New Roman', Times, serif;
  padding: 0;
  margin: 0;
}
```

# License

MIT © [https://github.com/fernandoem88/rcc-loader](https://github.com/fernandoem88/rcc-loader)
