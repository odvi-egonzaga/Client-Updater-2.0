import { Hono } from 'hono'
import { syncJobsRoutes } from './jobs'

export const syncRoutes = new Hono()

// Register all sync route modules
syncRoutes.route('/', syncJobsRoutes)
