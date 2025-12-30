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

export class D1Client {
  private accountId: string;
  private databaseId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, databaseId: string, apiToken: string) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`D1 API error: ${response.status} ${error}`);
    }

    const json = await response.json();
    
    // Cloudflare API wraps responses in a "result" array
    // Check if response has Cloudflare API wrapper format
    if (json.result && Array.isArray(json.result) && json.result.length > 0) {
      return json.result[0] as T;
    }
    
    // If no wrapper, return directly
    return json as T;
  }

  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<D1QueryResult> {
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
    const body: any = {
      sql,
    };

    if (params.length > 0) {
      body.params = params;
    }

    // Cloudflare D1 API uses /query endpoint for both queries and executes
    const result = await this.request<D1QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Convert D1QueryResult to D1ExecuteResult format
    return {
      success: result.success,
      meta: result.meta,
    };
  }

  async queryFirst<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    if (!result || !result.results || !Array.isArray(result.results)) {
      return null;
    }
    return result.results.length > 0 ? result.results[0] : null;
  }

  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    if (!result || !result.results || !Array.isArray(result.results)) {
      return [];
    }
    return result.results;
  }
}

