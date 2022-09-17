# React css components loader (rcc-loader)

[![NPM](https://img.shields.io/npm/v/rcc-loader.svg)](https://www.npmjs.com/package/rcc-loader)

> This loader is built to generate types from an imported css module and map its classes into react components in order to use props instead of classNames.
>
> - **fast classNames mapping**
> - **easy to debug in React dev tools**
> - **type definition for css module classNames**

in case you are only looking for css module types definition, jump down to (the bottom of this page)[#-exporting-only-the-style-module].

## Example

let's suppose to have the following scss file _my-app.module.scss_

```scss
.root {
  background: white;
  color: black;
  &--dark-mode {
    background: black;
    color: white;
  }
}

.btn {
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
.delete-btn,
.delete-btn_ext_btn {
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
import { toRCC, RCC } from 'rcc-loader/dist/rcc-core'
import _style from './my-app.module.scss'

export interface RootProps {
  darkMode?: boolean
}

export interface BtnProps {
  size?: 'sm' | 'md' | 'lg'
}
// DeleteBtnProps extends BtnProps because we defined the class .delete-btn_ext_btn
export interface DeleteBtnProps extends BtnProps {
  disabled?: boolean
}

const cssComponents = toRCC(_style) as {
  Root: RCC<RootProps>
  Btn: RCC<BtnProps>
  DeleteBtn: RCC<DeleteBtnProps>
}

export default cssComponents

// the following line is used for caching purpose: to not generate the file again if nothing changed in the css file
// ##hash## #eso #ext= #cn= #ofn
```

now we can use it in our main component _MyComponent.tsx_

```tsx
import S from './my-app.rcc'

const MyComponent = ({
  darkMode,
  disabld,
  disabled
}: {
  darkMode: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}) => {
  return (
    // pass your classNames values to the "$cn" prop
    <S.Root.div $cn={{ darkMode }}>
      <S.Btn.button $cn={{ size }}>I am a varible size button</S.Btn.button>
      <S.DeleteBtn.button $cn={{ size: 'lg', disabled }}>
        I am a large Delete button
      </S.DeleteBtn.button>
    </S.Root.div>
  )
}
```

## how to Install

```bash
npm i -D rcc-loader
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
             * exports: (optional: { rcc: boolean, style: boolean} | Function).
             * exports.rcc: true by default. set it to false in case you dont want to export rcc components.
             * exports.style: false by default. set it to true in case you want to export ModuleStyle definitions.
             *  you can use a function in case you want to set it only for given modules or name templates
             * eg: (filename, fileDir) => /-eso\.module\.scss$/.test(filename) ? ({ style: true, rcc: false }) : undefined
             * in this case, my-style-eso.module.scss for example will export only the ModuleStyle type
             **/
            exports: { rcc: true, style: false },
            // getOutputFileName: (optional), to generate file with different name then the defualt one.
            getOutputFileName: (filename, fileDir) =>
              `awesomename-${filename.replace('.module.scss', '')}`,
            // sassOptions: (optional) - sassOptions to pass to sass compiler
            // => sass.compileString(cssString, sassOptions). for example to resolve absolute imports, etc.
            sassOptions: {}
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

// S type is an index { [key: string]: Record<HtmlTag, RCC<any>> }
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

# ClassNames definition

## Component Class.

the rcc component comes from the root class definition. Each _component class_ will be transformed to a **PascalCase**.

```scss
.root {
  // => Root component
}

.item-wrapper {
  // =>ItemWrapper component
}

// Note!!!
// the following classes will create unexpected behaviour because they will have the same component names

.content-wrapper {
  // => ContentWrapper
}
.-content-wrapper {
  // => ContentWrapper
}
// to avoid confusion, we can directly define our component classes in PascalCase
.Root {
}
.ContentWrapper {
}
```

## component property class (element a modifier)

it should start with the component root name followed by double dashes. Each _component property_ should be written in **kebab-case** (eg: .Component--prop-one--prop-two)

```scss
.Wrapper {
  &--dark-mode {
  }
  &--size {
  }
}
// the Wrapper component will then have $cn with 2 props
// darkMode: that comes from .Wrapper--dark-mode
// size: that comes from .Wrapper--size
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
// $cn={flexCenter?: boolean; fontSizeLg?: boolean}
```

## ternary property class

some times we define a bunch of classes and want to use only one at the time excluding other ones: A or B or C. to do so, we need to use the special key **\_as\_**

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
// fontSize?: 'sm' | 'lg'

// Btn component own props
// color?: 'green' | 'yellow'
```

## Component class extension

some time we just want to extends a class and overwrite other css properties. in this case, we should use the **\_ext\_** key.

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

# Component name prefix

by default your component in react dev tools will appear like this: **<S.Root.div />**.
you can set the rcc \_\_prefix\_\_ value to a more specific name, for example to have **<Card.Root.div />**

```tsx
// here S is fully typed
import Card from './my-style.rcc'

(Card as any).__prefix__ = "Card."

export const MyComponent = () => {
  return <Card.Root.div>Hello World</S.Root.div>
}
```

# Exporting only the style module

with the following configuration,

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
            enabled: !!dev && isServer,
            exports: (fileName, fileDir) => ({ rcc: false, style: true })
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

our previous _my-app.module.scss_ file will generate the following content

```tsx
import _style from './my-app.module.scss'

export interface ModuleStyle {
  root: string
  'root--dark-mode': string
  btn: string
  'btn--sm_as_size': string
  'btn--md_as_size': string
  'btn--lg_as_size': string
  'delete-btn': string
  'delete-btn--disabled': string
}

export const style: ModuleStyle = _style as any
```

# License

MIT © [https://github.com/fernandoem88/rcc-loader](https://github.com/fernandoem88/rcc-loader)
