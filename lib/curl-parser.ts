export interface ParsedCurl {
  url: string | null;
  method: string; // GET, POST, PUT, DELETE, PATCH
  headers: Record<string, string>;
  body: string | null;
  timeout_ms: number | null; // --max-time veya --connect-timeout'tan çıkarılacak
}

/**
 * Parses a curl command string and extracts URL, method, headers, body, and timeout
 * @param curlCommand - The curl command string to parse
 * @returns ParsedCurl object or null if parsing fails
 */
export function parseCurlCommand(curlCommand: string): ParsedCurl | null {
  if (!curlCommand || !curlCommand.trim().startsWith('curl')) {
    return null;
  }

  const result: ParsedCurl = {
    url: null,
    method: 'GET',
    headers: {},
    body: null,
    timeout_ms: null,
  };

  try {
    // Normalize the command: remove line continuations and extra whitespace
    const normalized = curlCommand
      .replace(/\\\s*\n\s*/g, ' ') // Remove line continuations
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Tokenize: split by spaces but preserve quoted strings
    const tokens: string[] = [];
    let currentToken = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];

      if ((char === '"' || char === "'") && (i === 0 || normalized[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        currentToken += char;
      } else if (char === ' ' && !inQuotes) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
    if (currentToken) {
      tokens.push(currentToken);
    }

    // Remove 'curl' from the beginning
    if (tokens[0] === 'curl') {
      tokens.shift();
    }

    // Parse flags and arguments
    let i = 0;
    let useGet = false; // Track --get flag
    const dataParams: string[] = []; // Collect all -d parameters

    while (i < tokens.length) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];

      // --get flag: forces GET method and appends -d params as query string
      if (token === '--get' || token === '-G') {
        useGet = true;
        result.method = 'GET';
        i++;
        continue;
      }

      // Method: -X or --request
      if ((token === '-X' || token === '--request') && nextToken) {
        result.method = nextToken.toUpperCase();
        i += 2;
        continue;
      }

      // Headers: -H or --header
      if ((token === '-H' || token === '--header') && nextToken) {
        const headerValue = removeQuotes(nextToken);
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > 0) {
          const key = headerValue.substring(0, colonIndex).trim();
          const value = headerValue.substring(colonIndex + 1).trim();
          result.headers[key] = value;
        }
        i += 2;
        continue;
      }

      // Body: -d, --data, --data-raw, --data-binary, --data-urlencode
      if (
        token === '-d' ||
        token === '--data' ||
        token === '--data-raw' ||
        token === '--data-binary' ||
        token === '--data-urlencode'
      ) {
        if (nextToken) {
          // For --data-raw and --data-binary, always treat as raw data
          if (token === '--data-raw' || token === '--data-binary') {
            // For raw data, only remove outer quotes, preserve inner content
            const param = removeOuterQuotesOnly(nextToken);
            dataParams.push(param);
          } else {
            // For --data and -d, check if it's JSON or form data
            // First remove outer quotes to check the content
            const withoutOuterQuotes = removeOuterQuotesOnly(nextToken);
            const isJson = withoutOuterQuotes.trim().startsWith('{') || withoutOuterQuotes.trim().startsWith('[');
            
            if (isJson) {
              // For JSON data, preserve the structure (already removed outer quotes)
              dataParams.push(withoutOuterQuotes);
            } else {
              // Parse key="value" or key=value format (form data)
              const param = parseDataParam(nextToken);
              dataParams.push(param);
            }
          }
          
          // If method is still GET and --get is not used, change to POST (curl default behavior)
          if (result.method === 'GET' && !useGet) {
            result.method = 'POST';
          }
          i += 2;
        } else {
          // Handle case where body might be on next line or missing
          i++;
        }
        continue;
      }

      // Timeout: --max-time or --connect-timeout
      if ((token === '--max-time' || token === '--connect-timeout') && nextToken) {
        const timeoutSeconds = parseFloat(nextToken);
        if (!isNaN(timeoutSeconds)) {
          result.timeout_ms = Math.round(timeoutSeconds * 1000);
        }
        i += 2;
        continue;
      }

      // URL: Check if token looks like a URL
      if (isUrl(token)) {
        result.url = removeQuotes(token);
        i++;
        continue;
      }

      i++;
    }

    // If no URL found, try to find it as the last argument that looks like a URL
    if (!result.url) {
      for (let j = tokens.length - 1; j >= 0; j--) {
        const token = removeQuotes(tokens[j]);
        // Skip if it's a flag value
        if (token.startsWith('-')) {
          continue;
        }
        if (isUrl(token)) {
          result.url = token;
          break;
        }
      }
    }

    // If still no URL, parsing failed
    if (!result.url) {
      return null;
    }

    // Handle data parameters
    if (dataParams.length > 0) {
      if (useGet) {
        // --get flag: append -d params as query string to URL
        // Don't use URLSearchParams.append() to avoid double-encoding
        // curl -d values are already properly formatted
        const urlObj = new URL(result.url);
        const existingSearch = urlObj.search ? urlObj.search.slice(1) : '';
        const newParams = dataParams.join('&');
        
        // Combine existing and new params without re-encoding
        if (existingSearch) {
          urlObj.search = `?${existingSearch}&${newParams}`;
        } else {
          urlObj.search = `?${newParams}`;
        }
        result.url = urlObj.href;
      } else {
        // No --get: combine all -d params as body
        // If multiple -d params, curl combines them with & (application/x-www-form-urlencoded)
        let bodyString: string;
        if (dataParams.length === 1) {
          bodyString = dataParams[0];
        } else {
          // Multiple params: combine with &
          bodyString = dataParams.join('&');
        }
        
        // Check if body is JSON (starts with { or [)
        const isJsonBody = bodyString.trim().startsWith('{') || bodyString.trim().startsWith('[');
        
        if (!isJsonBody) {
          // For form data, clean up quotes that might have been missed
          // This handles cases like 'api_key=...'&'engine=...' where quotes weren't properly removed
          bodyString = bodyString
            .replace(/^'|'$/g, '') // Remove leading/trailing single quotes
            .replace(/^"|"$/g, '') // Remove leading/trailing double quotes
            .replace(/'&'/g, '&') // Replace '&' with &
            .replace(/'([^']*)'/g, '$1') // Remove single quotes around values
            .replace(/"([^"]*)"/g, '$1'); // Remove double quotes around values
        } else {
          // For JSON, only remove outer quotes if present, preserve inner JSON structure
          bodyString = removeOuterQuotesOnly(bodyString);
        }
        
        result.body = bodyString;
      }
    }
    
    // If URL already has query parameters and method is GET, don't use body
    // Some APIs (like SerpAPI) use GET with query params, not POST with body
    if (result.method === 'GET' && result.body) {
      // Check if URL has query params
      try {
        const urlObj = new URL(result.url);
        if (urlObj.searchParams.toString()) {
          // URL already has query params, remove body (GET requests shouldn't have body)
          result.body = null;
        }
      } catch {
        // URL parsing failed, keep body as is
      }
    }

    // Validate method is one of the supported methods
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(result.method)) {
      result.method = 'GET';
    }

    return result;
  } catch (error) {
    console.error('Error parsing curl command:', error);
    return null;
  }
}

/**
 * Parses a data parameter in key="value" or key=value format
 * Handles quoted values correctly and removes all quotes
 */
function parseDataParam(param: string): string {
  if (!param) return param;
  
  // First remove outer quotes if present
  let trimmed = removeQuotes(param.trim());
  
  const equalIndex = trimmed.indexOf('=');
  
  if (equalIndex <= 0) {
    // No = sign, return as is (already removed outer quotes)
    return trimmed;
  }
  
  const key = trimmed.substring(0, equalIndex).trim();
  let value = trimmed.substring(equalIndex + 1);
  
  // Remove quotes from value if present (both outer and inner quotes)
  // Handle both "value" and 'value' formats, and nested quotes
  value = removeQuotes(value);
  
  // Also remove any remaining quotes that might be in the middle
  // This handles cases like 'api_key=value' where the whole thing was quoted
  value = value.replace(/^['"]+|['"]+$/g, '');
  
  return `${key}=${value}`;
}

/**
 * Removes surrounding quotes from a string
 */
function removeQuotes(str: string): string {
  if (!str) return str;
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Removes only outer quotes from a string, preserving inner quotes
 * This is used for JSON/raw data where inner quotes must be preserved
 */
function removeOuterQuotesOnly(str: string): string {
  if (!str) return str;
  const trimmed = str.trim();
  // Only remove quotes if they wrap the entire string
  // Check for balanced quotes at the start and end
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1)
  ) {
    // Make sure it's actually outer quotes by checking if removing them leaves valid content
    const withoutQuotes = trimmed.slice(1, -1);
    // If the content inside starts with { or [, it's likely JSON and we should preserve it
    if (withoutQuotes.trim().startsWith('{') || withoutQuotes.trim().startsWith('[')) {
      return withoutQuotes;
    }
    // For other cases, check if there are balanced quotes inside
    // Simple heuristic: if removing outer quotes doesn't break the structure, do it
    return withoutQuotes;
  }
  return trimmed;
}

/**
 * Checks if a string looks like a URL
 */
function isUrl(str: string): boolean {
  if (!str) return false;
  const cleaned = removeQuotes(str);
  try {
    // Try to create a URL object
    new URL(cleaned);
    return true;
  } catch {
    // Check if it starts with http:// or https://
    return /^https?:\/\//i.test(cleaned);
  }
}

