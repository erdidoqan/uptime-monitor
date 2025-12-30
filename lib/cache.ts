// Simple cache utility with memory cache and localStorage fallback

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

  private getStorageKey(key: string): string {
    return `cache_${key}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
      } catch (error) {
        // localStorage might be full or disabled, ignore
        console.warn('Failed to store in localStorage:', error);
      }
    }
  }

  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Remove expired entry from memory
    if (memoryEntry && this.isExpired(memoryEntry)) {
      this.memoryCache.delete(key);
    }

    // Try localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.getStorageKey(key));
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (!this.isExpired(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Remove expired entry
            localStorage.removeItem(this.getStorageKey(key));
          }
        }
      } catch (error) {
        // Invalid JSON or other error, remove it
        localStorage.removeItem(this.getStorageKey(key));
      }
    }

    return null;
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.getStorageKey(key));
      } catch {
        // Ignore errors
      }
    }
  }

  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        // Clear all cache entries from localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {
        // Ignore errors
      }
    }
  }

  // Generate cache key for monitor checks
  getChecksKey(monitorId: string, timeRange: 'day' | 'week' | 'month', startDate: number): string {
    return `monitor-checks-${monitorId}-${timeRange}-${startDate}`;
  }
}

export const cache = new Cache();

