import { getD1RestClient, isD1RestConfigured } from './d1-rest-client';

interface D1QueryResult {
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows: any[];
  };
  results: any[];
}

interface D1ExecuteResult {
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
  };
}

/**
 * D1Client wrapper that uses REST adapter when available
 * Falls back to direct Cloudflare API if REST is not configured
 */
export class D1Client {
  private restClient: ReturnType<typeof getD1RestClient> | null = null;
  private accountId?: string;
  private databaseId?: string;
  private apiToken?: string;
  private baseUrl?: string;

  constructor() {
    if (isD1RestConfigured()) {
      this.restClient = getD1RestClient();
    } else {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
      const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

      if (!accountId || !databaseId || !apiToken) {
        const missing = [];
        if (!accountId) missing.push('CLOUDFLARE_ACCOUNT_ID');
        if (!databaseId) missing.push('CLOUDFLARE_D1_DATABASE_ID');
        if (!apiToken) missing.push('CLOUDFLARE_D1_API_TOKEN');
        
        throw new Error(
          `Missing D1 configuration: ${missing.join(', ')} must be set. Either D1_REST_URL or all Cloudflare D1 environment variables are required.`
        );
      }

      this.accountId = accountId;
      this.databaseId = databaseId;
      this.apiToken = apiToken;
      this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('Direct API mode not initialized');
    }
    const url = `${this.baseUrl}${endpoint}`;
    
    let response: Response;
    try {
      response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    } catch (error: any) {
      throw new Error(
        `Failed to connect to D1 API: ${error.message || 'Network error'}. Please check your environment variables.`
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unknown error';
      }
      throw new Error(`D1 API error: ${response.status} ${errorText}`);
    }

    try {
      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to parse D1 API response: ${error.message}`);
    }
  }

  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<D1QueryResult> {
    if (this.restClient) {
      const stmt = this.restClient.prepare(sql).bind(...params);
      const result = await stmt.all<T>();
      return {
        success: result.success,
        results: result.results,
        meta: {
          duration: result.meta.duration,
          rows_read: result.meta.rows_read,
          rows_written: result.meta.rows_written,
          last_row_id: result.meta.last_row_id,
          changed_db: result.meta.changes > 0,
          size_after: 0,
          rows: result.results,
        },
      };
    }

    const body: any = {
      sql,
    };

    if (params.length > 0) {
      body.params = params;
    }

    return this.request<D1QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async execute(sql: string, params: any[] = []): Promise<D1ExecuteResult> {
    if (this.restClient) {
      const stmt = this.restClient.prepare(sql).bind(...params);
      const result = await stmt.run();
      return {
        success: result.success,
        meta: {
          duration: result.meta.duration,
          rows_read: result.meta.rows_read,
          rows_written: result.meta.rows_written,
          last_row_id: result.meta.last_row_id,
          changed_db: result.meta.changes > 0,
          size_after: 0,
        },
      };
    }

    const body: any = {
      sql,
    };

    if (params.length > 0) {
      body.params = params;
    }

    return this.request<D1ExecuteResult>('/execute', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async batch(queries: Array<{ sql: string; params?: any[] }>): Promise<any> {
    if (this.restClient) {
      const statements = queries.map(q => 
        this.restClient!.prepare(q.sql).bind(...(q.params || []))
      );
      return this.restClient.batch(statements);
    }

    return this.request('/batch', {
      method: 'POST',
      body: JSON.stringify({
        queries: queries.map((q) => ({
          sql: q.sql,
          params: q.params || [],
        })),
      }),
    });
  }

  // Helper method to get first row
  async queryFirst<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    if (this.restClient) {
      const stmt = this.restClient.prepare(sql).bind(...params);
      return stmt.first<T>();
    }

    const result = await this.query<T>(sql, params);
    return result.results.length > 0 ? result.results[0] : null;
  }

  // Helper method to get all rows
  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.restClient) {
      const stmt = this.restClient.prepare(sql).bind(...params);
      const result = await stmt.all<T>();
      return result.results;
    }

    const result = await this.query<T>(sql, params);
    return result.results;
  }
}

// Singleton instance factory
let d1ClientInstance: D1Client | null = null;

export function getD1Client(): D1Client {
  if (!d1ClientInstance) {
    d1ClientInstance = new D1Client();
  }

  return d1ClientInstance;
}

