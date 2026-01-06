import { Hono } from 'hono'
import { pingEdgeFunction } from '@/lib/health'

export const edgeFunctionsHealthRoutes = new Hono()

edgeFunctionsHealthRoutes.get('/ping', async (c) => {
  const result = await pingEdgeFunction({ functionName: 'health-check' })
  return c.json(result)
})

import { validateEdgeFunctionAuth } from '@/lib/health'

edgeFunctionsHealthRoutes.get('/auth', async (c) => {
  const authHeader = c.req.header('authorization')
  const result = await validateEdgeFunctionAuth({
    functionName: 'health-check',
    authToken: authHeader,
  })
  return c.json(result)
})
