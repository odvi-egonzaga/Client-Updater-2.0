import { env } from '@/config/env'
import https from 'https'

class SynologyClient {
  private host: string
  private username: string
  private password: string
  private sessionID: string | null = null

  constructor() {
    this.host = env.SYNOLOGY_HOST ?? ''
    this.username = env.SYNOLOGY_USERNAME ?? ''
    this.password = env.SYNOLOGY_PASSWORD ?? ''
  }

  // Helper to perform fetch with custom agent for self-signed certs
  private async fetchWithAgent(url: string, options: RequestInit = {}) {
    // For local development with self-signed certs, especially with Next.js/Node fetch,
    // explicitly ignoring certificate errors at the process level for this specific request 
    // context is sometimes the most reliable way if agents aren't being picked up.
    
    // Create an agent that ignores self-signed certificate errors
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    
    // Note: In Next.js App Router (server components/actions), fetch is patched.
    // Standard https.Agent might not work as expected with the patched fetch.
    // However, for API routes (Pages router) or Route Handlers (App router), it runs in Node environment.
    // If the error persists, it's often because the fetch implementation doesn't support the 'agent' option directly
    // or is using Undici which needs a Dispatcher.

    // Let's try a more robust approach:
    // 1. Pass 'agent' for node-fetch compatibility
    // 2. Pass 'dispatcher' for Undici compatibility (Node 18+ native fetch)
    // 3. Set 'cache: no-store' to ensure we aren't hitting cached responses
    
    // @ts-ignore
    const fetchOptions: any = {
        ...options,
        cache: 'no-store',
        // 'agent' is for node-fetch / older polyfills
        agent: agent, 
    };
    
    // Attempt to handle Undici (Node 18+ native fetch) which Next.js uses
    // We can't easily import 'Agent' from undici without adding it as dependency,
    // but we can try to rely on the fact that sometimes just the node-fetch 'agent' isn't enough.
    
    try {
        return await fetch(url, fetchOptions);
    } catch (err: any) {
        // If fetch fails with a certificate error, it might be because 'agent' was ignored.
        // As a fallback for development environments, we can temporarily disable TLS check
        // WARNING: This is dangerous in production, but acceptable for "Synology local IP" scenarios 
        // if strictly scoped or if the user explicitly configured it.
        
        if (err.message?.includes('certificate') || err.cause?.message?.includes('certificate') || err.cause?.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
            console.warn('[Synology] Certificate error detected. Retrying with permissive fetch...');
            
            // This is a hacky workaround for environments where Agent isn't working for fetch
            const originalReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            
            try {
                const retryResponse = await fetch(url, { ...options, cache: 'no-store' });
                return retryResponse;
            } finally {
                // Restore original setting immediately
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalReject;
            }
        }
        throw err;
    }
  }

  async listFiles(folderPath: string) {
    if (!this.sessionID) await this.login()
    
    const params = new URLSearchParams({
      api: 'SYNO.FileStation.List',
      version: '2',
      method: 'list',
      folder_path: folderPath,
      _sid: this.sessionID!
    })

    const url = `${this.host}/webapi/entry.cgi?${params.toString()}`
    const response = await this.fetchWithAgent(url)
    
    if (!response.ok) {
      throw new Error(`Synology ListFiles error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.success) {
       throw new Error(`Synology ListFiles failed: ${JSON.stringify(data)}`)
    }
    return data.data.files
  }

  async getFile(filePath: string) {
    if (!this.sessionID) await this.login()
    
    const params = new URLSearchParams({
      api: 'SYNO.FileStation.Download',
      version: '2',
      method: 'download',
      path: filePath,
      mode: 'open',
      _sid: this.sessionID!
    })

    const url = `${this.host}/webapi/entry.cgi?${params.toString()}`
    const response = await this.fetchWithAgent(url)

    if (!response.ok) {
      throw new Error(`Synology GetFile error: ${response.status}`)
    }
    
    // Return array buffer or blob?
    return response.arrayBuffer()
  }

  async deleteFile(filePath: string) {
    if (!this.sessionID) await this.login()
      
    const params = new URLSearchParams({
      api: 'SYNO.FileStation.Delete',
      version: '2',
      method: 'delete',
      path: filePath,
      _sid: this.sessionID!
    })

    const url = `${this.host}/webapi/entry.cgi?${params.toString()}`
    const response = await this.fetchWithAgent(url)
    
    if (!response.ok) {
      throw new Error(`Synology DeleteFile error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.success) {
       throw new Error(`Synology DeleteFile failed: ${JSON.stringify(data)}`)
    }
    return data
  }

  async ping(): Promise<{ status: string; timestamp: string; version?: string; sid?: string }> {
    if (!this.host) {
      throw new Error('Synology host not configured')
    }

    const params = new URLSearchParams({
      api: 'SYNO.API.Info',
      version: '1',
      method: 'query',
      query: 'SYNO.API.Auth'
    })
    
    const infoUrl = `${this.host}/webapi/query.cgi?${params.toString()}`
    console.log(`[Synology] Pinging ${infoUrl}`)
    
    try {
      const response = await this.fetchWithAgent(infoUrl)
      
      if (!response.ok) {
        throw new Error(`Synology API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
         throw new Error(`Synology API returned error: ${JSON.stringify(data)}`)
      }

      let sid: string | undefined

      // If we have credentials, try to login to verify them
      if (this.username && this.password) {
        sid = await this.login()
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: data.data?.['SYNO.API.Auth']?.maxVersion?.toString(),
        sid
      }
    } catch (error) {
      console.error('[Synology] Ping failed:', error)
      throw error
    }
  }

  private async login(): Promise<string> {
    const loginUrl = `${this.host}/webapi/auth.cgi`
    
    const params = new URLSearchParams({
      api: 'SYNO.API.Auth',
      version: '6',
      method: 'login',
      account: this.username,
      passwd: this.password,
      session: 'FileStation',
      format: 'sid'
    })

    console.log(`[Synology] Logging in...`)

    try {
      const response = await this.fetchWithAgent(`${loginUrl}?${params.toString()}`)

      if (!response.ok) {
          throw new Error(`Synology Auth error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
          throw new Error(`Synology Auth failed: ${JSON.stringify(data)}`)
      }

      if (data.data?.sid) {
          this.sessionID = data.data.sid
          return this.sessionID!
      }
      
      throw new Error('No SID in response')
    } catch (error) {
        console.error('[Synology] Login error:', error)
        this.sessionID = null
        throw error
    }
  }
}

export const synologyClient = new SynologyClient()
