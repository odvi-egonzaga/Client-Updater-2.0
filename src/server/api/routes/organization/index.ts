import { Hono } from 'hono'
import { branchRoutes } from './branches'
import { branchContactRoutes } from './branch-contacts'
import { areaRoutes } from './areas'
import { areaBranchRoutes } from './area-branches'

export const organizationRoutes = new Hono()

// Register all organization route modules
organizationRoutes.route('/branches', branchRoutes)
organizationRoutes.route('/branches', branchContactRoutes)
organizationRoutes.route('/areas', areaRoutes)
organizationRoutes.route('/areas', areaBranchRoutes)
