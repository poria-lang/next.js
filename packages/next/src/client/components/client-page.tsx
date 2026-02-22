'use client'

import type { ParsedUrlQuery } from 'querystring'
import type { Params } from '../../server/request/params'
import { LayoutRouterContext } from '../../shared/lib/app-router-context.shared-runtime'
import { use } from 'react'
import { urlSearchParamsToParsedUrlQuery } from '../route-params'
import { SearchParamsContext } from '../../shared/lib/hooks-client-context.shared-runtime'

/**
 * When the Page is a client component we send the params and searchParams to this client wrapper
 * where they are turned into dynamically tracked values before being passed to the actual Page component.
 *
 * additionally we may send promises representing the params and searchParams. We don't ever use these passed
 * values but it can be necessary for the sender to send a Promise that doesn't resolve in certain situations.
 * It is up to the caller to decide if the promises are needed.
 */
export function ClientPageRoot({
  Component,
  serverProvidedParams,
}: {
  Component: React.ComponentType<any>
  serverProvidedParams: null | {
    searchParams: ParsedUrlQuery | Promise<ParsedUrlQuery>
    params: Params | Promise<Params>
  }
}) {
  let searchParamsPromise: Promise<ParsedUrlQuery>
  let paramsPromise: Promise<Params>
  if (serverProvidedParams !== null) {
    const { searchParams, params } = serverProvidedParams
    if (typeof window === 'undefined') {
      const { createSearchParamsFromClient } =
        require('../../server/request/search-params') as typeof import('../../server/request/search-params')
      const { createParamsFromClient } =
        require('../../server/request/params') as typeof import('../../server/request/params')

      searchParamsPromise =
        searchParams instanceof Promise
          ? searchParams
          : createSearchParamsFromClient(searchParams)
      paramsPromise =
        params instanceof Promise ? params : createParamsFromClient(params)
    } else {
      const { createRenderSearchParamsFromClient } =
        require('../request/search-params.browser') as typeof import('../request/search-params.browser')
      const { createRenderParamsFromClient } =
        require('../request/params.browser') as typeof import('../request/params.browser')

      searchParamsPromise =
        searchParams instanceof Promise
          ? searchParams
          : createRenderSearchParamsFromClient(searchParams as ParsedUrlQuery)
      paramsPromise =
        params instanceof Promise
          ? params
          : createRenderParamsFromClient(params as Params)
    }
  } else {
    // When Cache Components is enabled, the server does not pass the params as
    // props; they are parsed on the client and passed via context.
    const layoutRouterContext = use(LayoutRouterContext)
    const params =
      layoutRouterContext !== null ? layoutRouterContext.parentParams : {}

    // This is an intentional behavior change: when Cache Components is enabled,
    // client segments receive the "canonical" search params, not the
    // rewritten ones. Users should either call useSearchParams directly or pass
    // the rewritten ones in from a Server Component.
    // TODO: Log a deprecation error when this object is accessed
    const searchParams = urlSearchParamsToParsedUrlQuery(
      use(SearchParamsContext)!
    )

    if (typeof window === 'undefined') {
      const { createSearchParamsFromClient } =
        require('../../server/request/search-params') as typeof import('../../server/request/search-params')
      const { createParamsFromClient } =
        require('../../server/request/params') as typeof import('../../server/request/params')

      searchParamsPromise = createSearchParamsFromClient(searchParams)
      paramsPromise = createParamsFromClient(params)
    } else {
      const { createRenderSearchParamsFromClient } =
        require('../request/search-params.browser') as typeof import('../request/search-params.browser')
      const { createRenderParamsFromClient } =
        require('../request/params.browser') as typeof import('../request/params.browser')

      searchParamsPromise = createRenderSearchParamsFromClient(searchParams)
      paramsPromise = createRenderParamsFromClient(params)
    }
  }

  return (
    <Component params={paramsPromise} searchParams={searchParamsPromise} />
  )
}
