/**
 * D1 REST Client
 * Local adapter that works with Drizzle ORM
 * Uses d1-secret-rest worker: POST /db/{dbName}/query
 */

interface D1RestConfig {
  baseUrl: string;
  secret?: string;
  databaseName?: string;
}

interface D1RestResult<T = Record<string, unknown>> {
  success: boolean;
  results: T[];
  meta?: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

export type D1RestClient = ReturnType<typeof createD1RestClient>;

export function createD1RestClient(config: D1RestConfig) {
  const { baseUrl, secret, databaseName } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`;
  }

  function getEndpoint(): string {
    if (databaseName) {
      return `${baseUrl}/db/${databaseName}/query`;
    }
    return `${baseUrl}/query`;
  }

  async function executeQuery<T = Record<string, unknown>>(
    query: string, 
    params: unknown[] = []
  ): Promise<D1RestResult<T>> {
    const endpoint = getEndpoint();
    let response: Response;
    
    try {
      response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, params }),
    });
    } catch (error: any) {
      throw new Error(
        `Failed to connect to D1 REST API: ${error.message || 'Network error'}. URL: ${endpoint}`
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unknown error';
      }
      throw new Error(`D1 REST Error: ${response.status} - ${errorText}`);
    }

    try {
      return await response.json() as Promise<D1RestResult<T>>;
    } catch (error: any) {
      throw new Error(`Failed to parse D1 REST response: ${error.message}`);
    }
  }

  function prepare(query: string) {
    let boundParams: unknown[] = [];

    const stmt = {
      bind(...values: unknown[]) {
        boundParams = values;
        return stmt;
      },

      async raw(): Promise<unknown[][]> {
        const result = await executeQuery(query, boundParams);
        return (result.results || []).map(row => 
          typeof row === 'object' && row !== null 
            ? Object.values(row) 
            : [row]
        ) as unknown[][];
      },

      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const result = await executeQuery<T>(query, boundParams);
        if (!result.success || !result.results?.length) return null;
        const row = result.results[0];
        if (colName && typeof row === 'object' && row !== null) {
          return (row as Record<string, unknown>)[colName] as T;
        }
        return row;
      },

      async run() {
        const result = await executeQuery(query, boundParams);
        return {
          success: result.success,
          results: result.results || [],
          meta: result.meta || { duration: 0, changes: 0, last_row_id: 0, rows_read: 0, rows_written: 0 },
        };
      },

      async all<T = Record<string, unknown>>() {
        const result = await executeQuery<T>(query, boundParams);
        return {
          success: result.success,
          results: result.results || [],
          meta: result.meta || { duration: 0, changes: 0, last_row_id: 0, rows_read: 0, rows_written: 0 },
        };
      },
    };

    return stmt;
  }

  return {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      return Promise.all(statements.map(stmt => stmt.all()));
    },
    async exec(query: string) {
      const result = await executeQuery(query);
      return { count: 1, duration: result.meta?.duration || 0 };
    },
  };
}

export function isD1RestConfigured(): boolean {
  return !!process.env.D1_REST_URL;
}

export function getD1RestClient() {
  const baseUrl = process.env.D1_REST_URL;
  const secret = process.env.D1_REST_SECRET;
  const databaseName = process.env.D1_DATABASE_NAME;

  if (!baseUrl) {
    throw new Error('D1_REST_URL not configured');
  }

  return createD1RestClient({ baseUrl, secret, databaseName });
}

