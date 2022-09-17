import React from 'react'
import { EMPTY_HTML_TAGS, EMPTY_SVG_TAGS } from './constants'

const isHTMLTag = (tag: string) =>
  tag in EMPTY_HTML_TAGS || tag in EMPTY_SVG_TAGS

export const addHTMLTags = (
  createRCCWithTag: (tag: string, prefi?: any) => React.FC,
  prefix: any
) => {
  if (typeof Proxy === 'undefined') {
    return createRCCWithTag
  }

  return new Proxy({} as any, {
    get(target, prop: string, receiver) {
      const tag = prop // prop.substring(1);

      if (target[tag]) return Reflect.get(target, prop, receiver)

      if (isHTMLTag(tag)) {
        const Component = createRCCWithTag(tag, prefix.value)
        const newFC = React.forwardRef((props: any, ref) => (
          <Component {...props} ref={ref} />
        ))
        newFC.displayName = `${(Component as any).displayName}.${tag}`
        target[prop] = newFC
        // return Reflect.get(target, prop, receiver)
      }

      return Reflect.get(target, prop, receiver)
    }
  }) as any
}
