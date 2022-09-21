import { styleParser } from 'rcc-loader/dist/rcc-core'
import { RCC } from 'rcc-loader/dist/src/typings'
import _style from './style.scss'

export interface GlobalClassesProps {
  className?: string
  fontSize28?: boolean
  fontSize52?: boolean
}

export interface BtnProps {
  darkMode?: boolean
  yolo?: boolean
}

export interface ContentProps {
  status?: 'collapsed' | 'expanded'
}

export interface ExpandedBtnProps extends BtnProps {}

export interface HeaderTitleProps {
  centered?: boolean
}

export interface RootProps {
  borderRadius?: boolean
  color?: 'green' | 'red' | 'yellow'
  darkYellow?: boolean
  subDarkYellow?: boolean
}

type GCP = GlobalClassesProps
const data = styleParser(_style)

const cssComponents = data.rccs as {
  Btn: RCC<GCP & BtnProps>
  BtnWrapper: RCC<GCP>
  ColorPicker: RCC<GCP>
  Content: RCC<GCP & ContentProps>
  ExpandedBtn: RCC<GCP & ExpandedBtnProps>
  HeaderTitle: RCC<GCP & HeaderTitleProps>
  Item: RCC<GCP>
  Root: RCC<GCP & RootProps>
  Selected: RCC<GCP>
}

export default cssComponents

// ##hash## #rcc_expo; #clases=--DEFAULT|--font-size-28|--font-size-52|btn|btn--dark-mode|btn--dark-mode--yolo|btn-wrapper|color-picker|content|content--collapsed_as_status|content--expanded_as_status|expanded-btn|expanded-btn_ext_btn|header-title|header-title--centered|item|root|root--border-radius|root--green_as_color|root--red_as_color|root--yellow_as_color|root--yellow_as_color--dark-yellow|root--yellow_as_color--dark-yellow--sub-dark-yellow|selected;#ofn=style.rcc;
