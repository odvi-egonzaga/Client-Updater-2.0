import { Hono } from 'hono'
import { configCategoryRoutes } from './config-categories'
import { configOptionRoutes } from './config-options'
import { configSettingRoutes } from './config-settings'
import { configAuditRoutes } from './config-audit'
import { activityRoutes } from './activity'

export const adminRoutes = new Hono()

// Register all admin route modules
adminRoutes.route('/config', configCategoryRoutes)
adminRoutes.route('/config', configOptionRoutes)
adminRoutes.route('/config', configSettingRoutes)
adminRoutes.route('/config', configAuditRoutes)
adminRoutes.route('/activity', activityRoutes)
