import { UTApi } from 'uploadthing/server'
import { env } from '@/config/env'

export class UploadThingClient {
  private api: UTApi | null = null

  constructor() {
    // UTApi automatically reads UPLOADTHING_TOKEN from environment
    // Only initialize if token is configured
    if (env.UPLOADTHING_TOKEN) {
      this.api = new UTApi()
    }
  }

  /**
   * Check if the client is configured
   */
  isConfigured(): boolean {
    return this.api !== null
  }

  /**
   * Get the underlying UTApi instance
   */
  getApi(): UTApi {
    if (!this.api) {
      throw new Error('UploadThing is not configured. Set UPLOADTHING_TOKEN environment variable.')
    }
    return this.api
  }

  /**
   * List files from UploadThing
   */
  async listFiles(options?: { limit?: number; offset?: number }) {
    const api = this.getApi()
    return api.listFiles(options)
  }

  /**
   * Delete a file by its key
   */
  async deleteFile(fileKey: string) {
    const api = this.getApi()
    return api.deleteFiles(fileKey)
  }

  /**
   * Delete multiple files by their keys
   */
  async deleteFiles(fileKeys: string[]) {
    const api = this.getApi()
    return api.deleteFiles(fileKeys)
  }

  /**
   * Get file URLs by their keys
   */
  async getFileUrls(fileKeys: string[]) {
    const api = this.getApi()
    return api.getFileUrls(fileKeys)
  }

  /**
   * Rename a file
   */
  async renameFile(fileKey: string, newName: string) {
    const api = this.getApi()
    return api.renameFiles({ [fileKey]: newName })
  }

  /**
   * Rename multiple files
   */
  async renameFiles(updates: Record<string, string>) {
    const api = this.getApi()
    return api.renameFiles(updates)
  }

  /**
   * Get usage info for the app
   */
  async getUsageInfo() {
    const api = this.getApi()
    return api.getUsageInfo()
  }
}

export const uploadThingClient = new UploadThingClient()
