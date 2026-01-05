import { env } from '@/config/env'

class NextBankClient {
  private apiUrl: string
  private username: string
  private password: string

  // this is for testing purposes only

  constructor() {
    this.apiUrl = env.NEXTBANK_API ?? ''
    this.username = env.NEXTBANK_API_USERNAME ?? ''
    this.password = env.NEXTBANK_API_PASSWORD ?? ''
  }

  private getAuthHeader(): Record<string, string> {
    if (!this.username || !this.password) return {}
    const token = btoa(`${this.username}:${this.password}`)
    return { Authorization: `Basic ${token}` }
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    
    const headers = {
      ...this.getAuthHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'dtt-framework-client',
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const contentType = response.headers.get('content-type')
      
      if (!response.ok) {
        if (contentType && contentType.includes('text/html')) {
           const text = await response.text()
           throw new Error(`NextBank API error: ${response.status} (HTML response): ${text.substring(0, 100)}...`)
        }
        throw new Error(`NextBank API error: ${response.status} ${response.statusText}`)
      }

      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      
      // If not JSON, return text if generic T is string, or try to return as is?
      // For now, assume JSON or void.
      const text = await response.text()
      try {
          return JSON.parse(text)
      } catch {
          return text as unknown as T
      }
    } catch (error) {
      console.error(`[NextBank] Request to ${endpoint} failed:`, error)
      throw error
    }
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async put<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async ping(fingerprint: string): Promise<{ status: string; timestamp: string }> {
    return this.post('/management/status', { fingerprint })
  }
}

export const nextbankClient = new NextBankClient()
