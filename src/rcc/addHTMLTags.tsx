import React, { ComponentProps, ElementType } from 'react'
import { EMPTY_HTML_TAGS, EMPTY_SVG_TAGS } from './constants'

const isHTMLTag = (tag: string) =>
  tag in EMPTY_HTML_TAGS || tag in EMPTY_SVG_TAGS

export type RCC<Props> = <
  Tag extends ElementType = 'div' // keyof JSX.IntrinsicElements | React.FC = "div"
>(
  props: Props & { $as?: Tag } & ComponentProps<Tag>
) => JSX.Element

export type TaggedRCC<
  Props,
  Tag extends ElementType // keyof JSX.IntrinsicElements | React.FC
> = (props: Props & ComponentProps<Tag>) => JSX.Element

export const addHTMLTags = <Props,>(
  Component: RCC<Props>
): RCC<Props> & {
  [K in keyof JSX.IntrinsicElements]: TaggedRCC<Omit<Props, '$as'>, K>
} => {
  if (typeof Proxy === 'undefined') {
    return Component as any
  }

  return new Proxy(Component as any, {
    get(target, prop: string, receiver) {
      const tag = prop // prop.substring(1);
      if (!target[prop] && isHTMLTag(tag)) {
        const as = { tag }
        const newFC = React.forwardRef((props: any, ref) => (
          <Component {...props} $as={as} ref={ref} />
        ))
        newFC.displayName = `${(Component as any).displayName}.${tag}`
        target[prop] = newFC
        return newFC
      }

      return Reflect.get(target, prop, receiver)
    }
  }) as any
}
