/**
 * Reports API routes index
 * Combines all reports routes into a single router
 */

import { Hono } from 'hono'
import { dashboardRoutes } from './dashboard'
import { exportsRoutes } from './exports'

export const reportsRoutes = new Hono()

// Mount dashboard routes under /dashboard
reportsRoutes.route('/dashboard', dashboardRoutes)

// Mount exports routes under /exports
reportsRoutes.route('/exports', exportsRoutes)
