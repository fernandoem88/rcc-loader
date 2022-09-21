# Typed css components loader

[![NPM](https://img.shields.io/npm/v/typed-classnames.svg)](https://www.npmjs.com/package/typed-classnames)

> This webpack loader is built to generate types from an imported css module and map its classes in order to use props instead of classNames.
>
> - **type definition for css module classNames**
> - **fast classNames mapping**
> - **easy to debug in React dev tools**

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
  &--sm_size {
    font-size: 10px;
  }
  &--md_size {
    font-size: 12px;
  }
  &--lg_size {
    font-size: 14px;
  }
}

.delete-btn {
  background: red;
  color: white;
  &--disabled {
    pointer-events: none;
    background: gray;
  }
}
```

for a quick test, let's define a test.js file where we can use the **styleCompiler** utility.

## exports option: style

```js
// test.js
const { styleCompiler } = require('typed-css-compponents')
styleCompiler('./my-app.module.scss', __dirname, { exports: { style: true } })
```

if we run **node ./test.js** on the terminal, the following file _my-app.rcc.tsx_ will be generated.

```tsx
import _style from './my-app.module.scss'

export interface ModuleStyle {
  root: string
  'root--dark-mode': string
  btn: string
  'btn--sm_size': string
  'btn--md_size': string
  'btn--lg_size': string
  'delete-btn': string
  'delete-btn--disabled': string
}

export const style: ModuleStyle = _style as any

// ##hash## this hash is used for caching purpose: to not generate this file again if there are no changes
```

## exports option: $cn

now if we change the configuration options to "_exports: { $cn: true }_", the generated file will export a utility functions factory (**$cn**) where all classes are already mapped.

```js
// test.js
const { styleCompiler } = require('typed-css-compponents')
styleCompiler('./my-app.module.scss', __dirname, { exports: { $cn: true } })
```

this configuration will generate the following file content

```tsx
import { styleParser } from 'typed-classnames/dist/rcc-core'
import { RCC } from 'typed-classnames/dist/src/typings'
import _style from './my-app.module.scss'

export interface GlobalClasses {
  className?: string
}

export interface RootProps {
  darkMode?: boolean
}

export interface BtnProps {
  smSize?: boolean
  mdSize?: boolean
  lgSize?: boolean
}

export interface DeleteBtnProps {
  disabled?: boolean
}

type GCP = GlobalClasses

const data = styleParser(_style)

export const $cn = data.$cn as {
  Root: (props?: RootProps) => string
  Btn: (props?: BtnProps) => string
  DeleteBtn: (props?: DeleteBtnProps) => string
}

// ##hash##
```

now we can use it in our main component _MyComponent.tsx_

```tsx
import { $cn } from './my-app.rcc'

const MyComponent = ({
  darkMode,
  disabled,
  size
}: {
  darkMode: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}) => {
  return (
    // pass our classNames values to the "$cn" prop
    <div className={$cn.Root({ darkMode })}>
      <button className={$cn.Btn({ className: 'extra class names' })}>
        I am a button with .btn and .extra .class .names classes
      </button>
      <button
        className={$cn.btn({
          disabled,
          smSize: size === 'sm',
          mdSize: size === 'md'
        })}
      >
        I am a button with variable size
      </button>
      // extending another class
      <button
        className={$cn.DeleteBtn({
          disabled,
          className: $cn.Btn({ smSize: true })
        })}
      >
        DeleteBtn will also have Btn classes
      </button>
    </div>
  )
}
```

## exports option: rccs

**rccs** stands for _react-css-components_ that are components that include already the **$cn** utility.
let's change our test.js as follows

```js
// test.js
const { styleCompiler } = require('typed-css-compponents')
styleCompiler('./my-app.module.scss', __dirname, { exports: { rccs: true } })
```

now, if we run node ./test.js again, our generated file will look like follows:

```tsx
import { styleParser } from 'typed-classnames/dist/rcc-core'
import { RCC } from 'typed-classnames/dist/src/typings'
import _style from './my-app.module.scss'

export interface GlobalClasses {
  className?: string
}

export interface RootProps {
  darkMode?: boolean
}

export interface BtnProps {
  smSize?: boolean
  mdSize?: boolean
  lgSize?: boolean
}

export interface DeleteBtnProps {
  disabled?: boolean
}

type GCP = GlobalClasses

const data = styleParser(_style)

const cssComponents = data.$rccs as {
  Root: RCC<RootProps>
  Btn: RCC<BtnProps>
  DeleteBtn: RCC<DeleteBtnProps>
}

export default cssComponents

// ##hash##
```

then we can use it like this

```tsx
import S from "./my-app.rcc"

const MyApp = ({ darkMode, disabled }) => {
  const cn1 = 'some other class names'
  return (
    <S.Root.div $cn={{ darkMode, className: cn1 }}>
    I am a div with .root.dark-mode? and .some.other.class.names
      <S.DeleBtn.button $cn={{ disabled }} >disabled delete btn</S.DeleteBtn.button>
    </S.Root.div>
  )
}
```

# ClassNames definition

in case we decide to use [$cn](#exports-option-$cn) or [cssComponents](#exports-option-rccs), some special definition can be useful

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

## component property class

this is the element modifier. it should start with the component root name followed by double dashes. Each _component property_ can be written in **kebab-case** (eg: .Component--prop-one).
however, its output will be in **camelCase**

```scss
.Wrapper {
  &--dark-mode {
  }
  &--size {
  }
}
// the $cn.Wrapper component will then have 2 props
// darkMode: that comes from .Wrapper--dark-mode
// size: that comes from .Wrapper--size
```

## global property class

defining _[component property class](#component-property-class)_ without the root component name can be a typo (in case of a missing "_&_" for example) at the begining of the class.
however, we consider it as a modifier for all components

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
// the $cn.Wrapper and the $cn.Item component will both have the global props
// flexCenter?: boolean;
// fontSizeLg?: boolean
```

anyway, if we are using only _$cn_ and not _cssComponents_, we don't need this approach at all, since we can create just a _global-classes_ and reuse it in our component when needed.

## ternary property class

some times we define a bunch of classes and want to use only one at the time excluding other ones: A or B or C. to do so, we need to use the special key **\_as\_**

```scss
.Btn {
  &--red_as_color {
    color: green;
  }
  &--yellow_as_color {
    color: yellow;
  }
}

// Btn component own props
// color?: 'green' | 'yellow'
```

we can then use it in tsx file like this

```tsx
import S, { $cn } from './my-app.rcc'

export const MyApp = ({ color }: { color: 'yellow' | 'green' }) => {
  return <button className={$cn.Btn({ color })}>click me</button>
  // or
  return <S.Btn.button $cn={{ color }}>click me</S.Btn.button>
}
```

## Component class extension

in case we want to extends a class and overwrite other css properties, we can use the **\_ext\_** key.

```scss
.Btn {
  border-radius: 3px;
  box-shadow: 4px 4px grey;
  &--disabled: {
    pointer-events: none;
  }
}

.PrimaryBtn,
.PrimaryBtn_ext_Btn {
  background: green;
  color: white;
}
// PrimaryBtn_ext_Btn tells us that the PrimaryBtn we just defined should extend the Btn previously defined
```

an example of use in a tsx file

```tsx
import S, { $cn } from './my-app.rcc'

export const MyApp = ({ disabled }: { disabled?: boolean }) => {
  // $cn
  return <button className={$cn.PrimaryBtn({ disabled })}>click me</button>
  // or
  // cssComponents
  return <S.PrimaryBtn.button $cn={{ disabled }}>click me</S.PrimaryBtn.button>
}
```

also, in this case, if we are just using $cn instead of cssComponents, this approach is not necessary since we can achieve the same behaviour by nesting the extenion in our class name

```tsx
<button
  className={$cn.Primary({
    disabled,
    className: $cn.Btn({ disabled: true })
  })}
>
  Primary will also have Btn classes
</button>
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

if for some particular reason, we want to have some default props for all components in the rcc context, we can use the **--DEFAULT** key.

```scss
.--DEFAULT {
  font-family: 'Times New Roman', Times, serif;
  padding: 0;
  margin: 0;
}
```

## with component

we can bind a component with some css coomponents like this

```tsx
import S from './my-app.rcc'
import Wrapper from './Wrapper'

// Root Wrapper will have .root class and all its relative modifier props
const RootWrapper = S.Root.__with(Wrapper)

const MyApp = ({ color }) => {
  return <RootWrapper $cn={{ color }} />
}
```

# Component name prefix

by default our _css component_ in react dev tools will appear like this: **<S.Root.div />**.
we can set the rcc \_\_prefix\_\_ value to a more specific name, for example to have **<Card.Root.div />**

```tsx

import Card from './my-style.rcc'

Card.__prefix__ = "Card."

export const MyComponent = () => {
  return <Card.Root.div>Hello World</S.Root.div>
}
```

## how to Install

```bash
npm i -D typed-classnames
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
          loader: 'typed-classnames',
          options: {
            /**
             * enabled: (required) the loader should be enabled only in Dev environment.
             * alternatively we can just, add the rccLoaderRule to webpack only in dev and set enabled to true by default
             */
            enabled: !!dev && isServer,
            /**
             * exports: (required: { rcc: boolean, style: boolean, $cn: boolean } | Function).
             * at least one of the 3 parameters should be true
             * exports.style: false by default. set it to true in case we want to export ModuleStyle definitions.
             * exports.$cn: false by default. set it to true in case we want to export $cn utility.
             * exports.rcc: false by default. set it to false in case we dont want to export rcc components.
             
             *  we can use a function in case we want to set different values for given files/name templates
             * eg: (filename, fileDir) => /-eso\.module\.scss$/.test(filename) ? { style: true } : { $cn: true }
             * in this case, my-style-eso.module.scss for example will export only the ModuleStyle type
             **/
            exports: { style: false, $cn: true, rcc: false },
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

after setting up the config, we will first use the **styleParser** transformer in our react component. for example in _MyComponent.tsx_

```tsx
import { styleParser } from 'typed-classnames/dist/rcc-core'
import style from './my-style.module.scss'

// S type is an index { [key: string]: Record<HtmlTag, RCC<any>> }
const { rccs: S, $cn } = styleParser(style)

export const MyComponent = () => {
  return <div className={$cn.Root()}>Hello world</div>
  // 0r
  return <S.Root.div>Hello World again</S.Root.div>
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

# License

MIT © [https://github.com/fernandoem88/typed-classnames](https://github.com/fernandoem88/typed-classnames)
