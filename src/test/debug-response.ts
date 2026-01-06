import { Hono } from 'hono'
import { z } from 'zod'
import { validateRequest } from '@/server/api/middleware/validation'

async function debugCustomValidator() {
  const schema = z.object({
    companyId: z.string().min(1, 'Company ID is required'),
    periodYear: z.coerce.number().int().min(2000).max(2100),
  })

  const app = new Hono()
  app.get('/test', validateRequest('query', schema), (c) => {
    return c.json({ success: true, data: 'test' })
  })

  // Test with invalid query params
  const response = await app.request('/test?periodYear=2024')
  console.log('Response status:', response.status)
  console.log('Response headers:', Object.fromEntries(response.headers.entries()))

  const text = await response.text()
  console.log('Response body (text):', text)
  console.log('Response body length:', text.length)
  console.log('First 10 chars:', text.substring(0, 10))

  try {
    const json = await response.json()
    console.log('Parsed JSON:', json)
  } catch (error) {
    console.error('JSON parse error:', error)
  }
}

debugCustomValidator().catch(console.error)
