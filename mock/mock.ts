'use strict'
import { flushState } from './backend'

declare const global: any

export const fetchStack: Map<string, {
  status: number
  flushQueue?: any[]
  data?: any
  json?: () => Promise<string>
}> = new Map<string, any>()

export const parseObject = (obj: any) => {
  if (typeof obj === 'string') {
    return obj
  }
  if (obj && typeof obj === 'object') {
    return JSON.stringify(obj)
  }
  return ''
}

const context = typeof window !== 'undefined' ? window : global

const originFetch = context['fetch']

export function restore() {
  context['fetch'] = originFetch
}

export function mockFetch() {
  context['fetch'] = (uri: string, options?: {
    method?: any,
    body?: any
  }): any => {
    const method = options.method ? options.method.toLowerCase() : ''
    if (method !== 'options') {
      const dataPath = options.body ? parseObject(options.body) : ''
      if (method === 'get') {
        const pos = uri.indexOf('_=')
        if (pos !== -1) {
          uri = uri.substr(0, pos - 1)
        }
      }
      const result = fetchStack.get(uri.toLowerCase() + method + dataPath)
      // console.log(uri + method + dataPath, fetchStack)
      if (result && result.status === 200) {
        const promise = new Promise((resolve, reject) => {
          if (flushState.flushed) {
            resolve(result)
          } else {
            result.flushQueue.push([resolve, result])
          }
        })
        return promise
      } else if (result && result.status) {
        /* istanbul ignore if */
        return Promise.reject(new Error(`${result.data}, statu code: ${result.status}`))
      } else {
        /* istanbul ignore if */
        const definedUri: string[] = []
        fetchStack.forEach((val, key) => {
          definedUri.push(key)
        })
        throw new Error(
            `nothing expect return from server,
            uri: ${uri}, method: ${options.method},
            parsedUri: ${uri + method + dataPath}
            body: ${JSON.stringify(options.body)},
            defined uri: ${JSON.stringify(definedUri, null, 2)}`
        )
      }
    }
  }
}
