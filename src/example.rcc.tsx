import { createRccHelper } from 'rcc-loader/dist/rcc-core'
import _style from './example.scss'

const GlobalClasses = (p: {
  '$font-size-28'?: boolean
  '$font-size-52'?: boolean
}) => <RCCElement {...p} />

const Btn = (p: { '$dark-mode'?: boolean; $yolo?: boolean }) => (
  <RCCElement {...p} />
)

const Content = (p: { $status?: 'collapsed' | 'expanded' }) => (
  <RCCElement {...p} />
)

const HeaderTitle = (p: { $centered?: boolean }) => (
  <RCCElement {...p} rcc='HeaderTitle' />
)

const Root = (p: {
  '$border-radius'?: boolean
  $color?: 'green' | 'red' | 'yellow'
  '$dark-yellow'?: boolean
  '$sub-dark-yellow'?: boolean
}) => <RCCElement {...p} />

type GCP<T> = T & GlobalClassesProps
const createRCC = createRccHelper(style, {
  devDebugPrefix: 'S.'
})

const cssComponents = {
  Btn: createRCC<GCP<BtnProps>>('Btn'),
  BtnWrapper: createRCC<GCP<{}>>('BtnWrapper'),
  Content: createRCC<GCP<ContentProps>>('Content'),
  ExpandBtn: createRCC(ExpandBtn, { Btn }),
  HeaderTitle: createRCC<GCP<HeaderTitleProps>>('HeaderTitle'),
  Item: createRCC<GCP<{}>>('Item'),
  Likunza: createRCC<GCP<{}>>('Likunza'),
  Root: createRCC<GCP<RootProps>>('Root'),
  Selected: createRCC<GCP<{}>>('Selected')
}

export default cssComponents

// ##hash## #cn=--DEFAULT|--font-size-28|--font-size-52|Btn|Btn--dark-mode|Btn--dark-mode--yolo|BtnWrapper|Content|Content--collapsed_as_status|Content--expanded_as_status|ExpandBtn|ExpandBtn_ext_Btn|HeaderTitle|HeaderTitle--centered|Item|Likunza|Likunza_ext_Btn|Root|Root--border-radius|Root--green_as_color|Root--red_as_color|Root--yellow_as_color|Root--yellow_as_color--dark-yellow|Root--yellow_as_color--dark-yellow--sub-dark-yellow|Selected;#pfx=S.; #ofn=example.rcc;
