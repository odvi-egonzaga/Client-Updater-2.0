import { describe, it, expect } from 'vitest'
import * as schema from '../activity'

describe('Activity Logs Schema', () => {
  it('should export activityLogs table', () => {
    expect(schema.activityLogs).toBeDefined()
    expect(schema.activityLogs._.name).toBe('activity_logs')
  })

  it('should have userId column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('userId')
  })

  it('should have action column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('action')
  })

  it('should have resource column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('resource')
  })

  it('should have resourceId column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('resourceId')
  })

  it('should have details column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('details')
  })

  it('should have ipAddress column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('ipAddress')
  })

  it('should have userAgent column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('userAgent')
  })

  it('should have durationMs column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('durationMs')
  })

  it('should have statusCode column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('statusCode')
  })

  it('should have errorMessage column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('errorMessage')
  })

  it('should have createdAt column', () => {
    const columns = Object.keys(schema.activityLogs._.columns)
    expect(columns).toContain('createdAt')
  })

  it('should export activityLogsRelations', () => {
    expect(schema.activityLogsRelations).toBeDefined()
  })
})
