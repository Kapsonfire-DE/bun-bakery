/*!
 * SaltyAom's Trek Router router fork
 * Copyright(c) 2022 SaltyAom
 * MIT Licensed
 */

const splitOnce = (char: string, s: string) => {
    const i = s.indexOf(char)

    return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]
}

export const removeHostnamePath = (path: string) => {
    if (path.charCodeAt(0) === 47) return path

    const total = path.length

    // Worst case: http://a.aa/
    let i = 12

    for (; i < total; i++)
        if (path.charCodeAt(i) === 47)
            break

    return path.slice(i)
}

const parseQuery = (search: string) =>
    search.split("&").reduce((result, each) => {
        const [key, value] = splitOnce('=', each)
        result[key] = value

        return result
    }, {} as Record<string, string>)

/*!
 * router
 * Copyright(c) 2015-2017 Fangdun Cai
 * MIT Licensed
 */

// Static Param Any `*` `/` `:`
const [SKIND, PKIND, AKIND, STAR, SLASH, COLON] = [0, 1, 2, 42, 47, 58]

type Result<T = any> = [
    handler: undefined | T,
    params: [string, string][],
    query: Record<string, string>
]

export type HTTPMethod =
    | 'ACL'
    | 'BIND'
    | 'CHECKOUT'
    | 'CONNECT'
    | 'COPY'
    | 'DELETE'
    | 'GET'
    | 'HEAD'
    | 'LINK'
    | 'LOCK'
    | 'M-SEARCH'
    | 'MERGE'
    | 'MKACTIVITY'
    | 'MKCALENDAR'
    | 'MKCOL'
    | 'MOVE'
    | 'NOTIFY'
    | 'OPTIONS'
    | 'PATCH'
    | 'POST'
    | 'PROPFIND'
    | 'PROPPATCH'
    | 'PURGE'
    | 'PUT'
    | 'REBIND'
    | 'REPORT'
    | 'SEARCH'
    | 'SOURCE'
    | 'SUBSCRIBE'
    | 'TRACE'
    | 'UNBIND'
    | 'UNLINK'
    | 'UNLOCK'
    | 'UNSUBSCRIBE'

class TrekNode<T = any> {
    label: number
    prefix: string
    children: any[]
    kind: number
    map: Record<
        string,
        {
            handler: T
            pnames: string
        }
        >

    constructor(
        prefix = '/',
        children = [] as any[],
        kind = SKIND,
        map = Object.create(null)
    ) {
        this.label = prefix.charCodeAt(0)
        this.prefix = prefix
        this.children = children
        this.kind = kind
        this.map = map
    }

    addChild(n: any) {
        this.children.push(n)
    }

    findChild(c: number, t: number, l?: number, e?: TrekNode, i = 0) {
        for (l = this.children.length; i < l; i++) {
            e = this.children[i]
            if (c === e?.label && t === e.kind) {
                return e
            }
        }
    }

    findChildWithLabel(c: number, l?: number, e?: TrekNode, i = 0) {
        for (l = this.children.length; i < l; i++) {
            e = this.children[i]
            if (c === e?.label) {
                return e
            }
        }
    }

    findChildByKind(t: number, l?: number, e?: TrekNode, i = 0) {
        for (l = this.children.length; i < l; i++) {
            e = this.children[i]
            if (t === e?.kind) {
                return e
            }
        }
    }

    addHandler(method: string, handler: T, pnames: string) {
        this.map[method] = { handler, pnames }
    }

    findHandler(method: string) {
        return this.map[method]
    }
}

export default class Router<T = any> {
    _tree: TrekNode<T>
    routes: any[]

    constructor() {
        this._tree = new TrekNode()
        this.routes = []
    }

    add(method: string, path: string, handler: T) {
        let [i, l, pnames] = [0, path.length, [] as string[]]
        let ch: number, j: number

        this.routes.push([method, path, handler])

        for (; i < l; ++i) {
            ch = path.charCodeAt(i)
            if (ch === COLON) {
                j = i + 1

                this._insert(method, path.substring(0, i), SKIND)
                while (i < l && path.charCodeAt(i) !== SLASH) i++

                pnames.push(path.substring(j, i))
                path = path.substring(0, j) + path.substring(i)
                i = j
                l = path.length

                if (i === l)
                    return void this._insert(
                        method,
                        path.substring(0, i),
                        PKIND,
                        pnames,
                        handler
                    )

                this._insert(method, path.substring(0, i), PKIND, pnames)
            } else if (ch === STAR) {
                this._insert(method, path.substring(0, i), SKIND)
                pnames.push(path.substring(i))
                return void this._insert(
                    method,
                    path.substring(0, l),
                    AKIND,
                    pnames,
                    handler
                )
            }
        }
        this._insert(method, path, SKIND, pnames, handler)
    }

    _insert(
        method: string,
        path: string,
        t: number,
        pnames?: any,
        handler?: any
    ) {
        // Copy current TrekNode as root
        let [cn] = [this._tree]
        let prefix, sl, pl, l, max, n, c

        while (true) {
            prefix = cn.prefix
            sl = path.length
            pl = prefix.length
            l = 0

            // LCP
            max = sl < pl ? sl : pl
            while (l < max && path.charCodeAt(l) === prefix.charCodeAt(l)) {
                l++
            }

            /*
      If (l === 0) {
        // At root TrekNode
        cn.label = search.charCodeAt(0)
        cn.prefix = search
        if (handler !== undefined) {
          cn.addHandler(method, { pnames, handler })
        }
      } else if (l < pl) {
      */
            if (l < pl) {
                // Split TrekNode
                n = new TrekNode(
                    prefix.substring(l),
                    cn.children,
                    cn.kind,
                    cn.map
                )
                cn.children = [n] // Add to parent

                // Reset parent TrekNode
                cn.label = prefix.charCodeAt(0)
                cn.prefix = prefix.substring(0, l)
                cn.map = Object.create(null)
                cn.kind = SKIND

                if (l === sl) {
                    // At parent TrekNode
                    cn.addHandler(method, handler, pnames)
                    cn.kind = t
                } else {
                    // Create child TrekNode
                    n = new TrekNode(path.substring(l), [], t)
                    n.addHandler(method, handler, pnames)
                    cn.addChild(n)
                }
            } else if (l < sl) {
                path = path.substring(l)
                c = cn.findChildWithLabel(path.charCodeAt(0))
                if (c !== undefined) {
                    // Go deeper
                    cn = c
                    continue
                }
                // Create child TrekNode
                n = new TrekNode(path, [], t)
                n.addHandler(method, handler, pnames)
                cn.addChild(n)
            } else if (handler !== undefined) {
                // TrekNode already exists
                cn.addHandler(method, handler, pnames)
            }
            return
        }
    }

    find(method: HTTPMethod, url: string): Result<T> {
        const [path, stringifiedQuery] = splitOnce("?", removeHostnamePath(url))

        let result = this._find(method, path, undefined, 0, [
            undefined,
            []
        ] as any)

        // @ts-ignore
        result[2] = stringifiedQuery ? parseQuery(stringifiedQuery) : {}

        return result
    }

    _find(
        method: HTTPMethod,
        path: string,
        cn: TrekNode | undefined,
        n: number,
        result: Result<T>
    ) {
        cn = cn || this._tree // Current TrekNode as root
        const sl = path.length
        const prefix = cn.prefix
        const pvalues = result[1] as any[] // Params
        let i, pl, l, max, c
        let preSearch // Pre search

        // Search order static > param > match-any
        if (sl === 0 || path === prefix) {
            // Found
            const r = cn.findHandler(method)
            if ((result[0] = r && r.handler) !== undefined) {
                const pnames = r.pnames
                if (pnames !== undefined) {
                    for (i = 0, l = pnames.length; i < l; ++i) {
                        pvalues[i] = [pnames[i], pvalues[i]]
                    }
                }
            }
            return result
        }

        pl = prefix.length
        l = 0

        // LCP
        max = sl < pl ? sl : pl
        while (l < max && path.charCodeAt(l) === prefix.charCodeAt(l)) l++

        if (l === pl) path = path.substring(l)

        preSearch = path

        // Static TrekNode
        c = cn.findChild(path.charCodeAt(0), SKIND)
        if (c !== undefined) {
            this._find(method, path, c, n, result)
            if (result[0] !== undefined) {
                return result
            }
            path = preSearch
        }

        // Not found TrekNode
        if (l !== pl) {
            return result
        }

        // Param TrekNode
        c = cn.findChildByKind(PKIND)
        if (c !== undefined) {
            l = path.length
            i = 0
            while (i < l && path.charCodeAt(i) !== SLASH) {
                i++
            }

            pvalues[n] = path.substring(0, i)

            n++
            preSearch = path
            path = path.substring(i)

            this._find(method, path, c, n, result)
            if (result[0] !== undefined) return result

            n--
            pvalues.pop()
            path = preSearch
        }

        // Any TrekNode
        c = cn.findChildByKind(AKIND)
        if (c !== undefined) {
            pvalues[n] = path
            path = '' // End search
            this._find(method, path, c, n, result)
        }

        return result
    }
}