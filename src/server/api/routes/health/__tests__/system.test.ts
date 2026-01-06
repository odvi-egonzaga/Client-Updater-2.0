import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { systemHealthRoute } from '../system'

describe('System Health Endpoint', () => {
  it('should return health status', async () => {
    const app = new Hono()
    app.route('/system', systemHealthRoute)

    const res = await app.request('/system')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('services')
  })

  it('should include queue status', async () => {
    const app = new Hono()
    app.route('/system', systemHealthRoute)

    const res = await app.request('/system')
    const data = await res.json()

    expect(data).toHaveProperty('queues')
  })
})






