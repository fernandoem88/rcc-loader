import React from 'react'
import { RCC } from '../typings'
import { EMPTY_HTML_TAGS, EMPTY_SVG_TAGS } from './constants'

const isHTMLTag = (tag: string) =>
  tag in EMPTY_HTML_TAGS || tag in EMPTY_SVG_TAGS

export const addHTMLTags = <Props,>(Component: any): RCC<Props> => {
  if (typeof Proxy === 'undefined') {
    return Component
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
        // return Reflect.get(target, prop, receiver)
      }

      return Reflect.get(target, prop, receiver)
    }
  }) as any
}
