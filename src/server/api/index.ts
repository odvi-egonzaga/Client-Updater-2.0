import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { tracingMiddleware } from './middleware/tracing'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'

const app = new Hono().basePath('/api')

// Global middleware
app.use('*', tracingMiddleware)
app.use('*', cors())

// Public routes
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Protected routes - require authentication
app.use('*', authMiddleware)
app.route('/health', healthRoutes)
app.route('/users', usersRoutes)

export { app }
export type AppType = typeof app
