import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CanadianProduct } from '../types/product';

interface ProductDB extends DBSchema {
  products: {
    key: string;
    value: CanadianProduct & { cacheKey: string };
    indexes: {
      'by-brand': string;
      'by-date': string;
      'by-cache-key': string;
    };
  };
  metadata: {
    key: [string, string];
    value: {
      key: string;
      lastUpdated: string;
      cacheKey: string;
    };
  };
}

// Helper function to get environment variables that works in both Vite and Node
const getEnvVar = (key: string): string => {
  // Try Vite environment variables first
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteKey = `VITE_${key}`;
    return import.meta.env[viteKey];
  }
  // Fallback to process.env
  return process.env[key] || '';
};

// Get environment-specific DB name
const ENV = import.meta.env.MODE || process.env.NODE_ENV || 'development';
const PROJECT_ID = getEnvVar('FIREBASE_PROJECT_ID');
const DB_NAME = `canadian-products-${PROJECT_ID}-${ENV}`;
const DB_VERSION = 1;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

class CacheService {
  private db: IDBPDatabase<ProductDB> | null = null;

  private getCacheKey(userRole?: string) {
    const key = `products-${userRole || 'default'}`;
    console.log('getCacheKey:', { userRole, key });
    return key;
  }

  async initDB() {
    if (this.db) return this.db;

    console.log('initDB: Creating new database connection');
    this.db = await openDB<ProductDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        console.log('initDB: Upgrading database schema');
        // Products store with role-based keys
        const productStore = db.createObjectStore('products', {
          keyPath: ['_id', 'cacheKey']
        });
        productStore.createIndex('by-brand', 'brand_name');
        productStore.createIndex('by-date', 'date_modified');
        productStore.createIndex('by-cache-key', 'cacheKey');

        // Metadata store
        db.createObjectStore('metadata', {
          keyPath: ['key', 'cacheKey']
        });
      }
    });

    return this.db;
  }

  async cacheProducts(products: CanadianProduct[], userRole?: string) {
    console.log('cacheProducts: Starting', { count: products.length, userRole });
    const db = await this.initDB();
    const tx = db.transaction(['products', 'metadata'], 'readwrite');
    const cacheKey = this.getCacheKey(userRole);

    try {
      // Store products with cache key
      await Promise.all([
        ...products.map(product => tx.objectStore('products').put({
          ...product,
          cacheKey
        })),
        tx.objectStore('metadata').put({
          key: 'lastUpdate',
          cacheKey,
          lastUpdated: new Date().toISOString()
        })
      ]);

      await tx.done;
      console.log('cacheProducts: Success', { count: products.length, userRole });
    } catch (error) {
      console.error('cacheProducts: Error', { error, userRole });
      throw error;
    }
  }

  async getCachedProducts(userRole?: string): Promise<CanadianProduct[]> {
    console.log('getCachedProducts: Starting', { userRole });
    const db = await this.initDB();
    const cacheKey = this.getCacheKey(userRole);
    const index = db.transaction('products').store.index('by-cache-key');
    const results = await index.getAll(cacheKey);
    console.log('getCachedProducts: Success', { count: results.length, userRole });
    return results;
  }

  async searchCachedProducts(searchTerm: string, userRole?: string): Promise<CanadianProduct[]> {
    const db = await this.initDB();
    const cacheKey = this.getCacheKey(userRole);
    const index = db.transaction('products').store.index('by-cache-key');
    const products = await index.getAll(cacheKey);
    
    if (!searchTerm.trim()) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.brand_name.toLowerCase().includes(term) ||
      product.products.some(p => p.toLowerCase().includes(term)) ||
      product.categories.some(c => c.toLowerCase().includes(term))
    );
  }

  async isCacheValid(userRole?: string): Promise<boolean> {
    console.log('isCacheValid: Checking', { userRole });
    const db = await this.initDB();
    const cacheKey = this.getCacheKey(userRole);
    const metadata = await db.get('metadata', ['lastUpdate', cacheKey]);
    
    if (!metadata) {
      console.log('isCacheValid: No metadata found', { userRole });
      return false;
    }

    const lastUpdate = new Date(metadata.lastUpdated).getTime();
    const now = new Date().getTime();
    const isValid = now - lastUpdate < CACHE_DURATION;
    console.log('isCacheValid: Result', { isValid, userRole, lastUpdate });
    return isValid;
  }

  async clearCache(userRole?: string) {
    const db = await this.initDB();
    const tx = db.transaction(['products', 'metadata'], 'readwrite');
    const cacheKey = this.getCacheKey(userRole);
    
    // Clear only products for this role
    const index = tx.objectStore('products').index('by-cache-key');
    const keys = await index.getAllKeys(cacheKey);
    await Promise.all([
      ...keys.map(key => tx.objectStore('products').delete(key)),
      tx.objectStore('metadata').delete(['lastUpdate', cacheKey])
    ]);

    await tx.done;
  }
}

export const cacheService = new CacheService();
