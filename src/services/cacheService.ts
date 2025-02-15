import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CanadianProduct } from '../types/product';

interface ProductDB extends DBSchema {
  products: {
    key: string;
    value: CanadianProduct;
    indexes: {
      'by-brand': string;
      'by-date': string;
    };
  };
  metadata: {
    key: string;
    value: {
      lastUpdated: string;
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

  async initDB() {
    if (this.db) return this.db;

    this.db = await openDB<ProductDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Products store
        const productStore = db.createObjectStore('products', {
          keyPath: '_id'
        });
        productStore.createIndex('by-brand', 'brand_name');
        productStore.createIndex('by-date', 'date_modified');

        // Metadata store
        db.createObjectStore('metadata', {
          keyPath: 'key'
        });
      }
    });

    return this.db;
  }

  async cacheProducts(products: CanadianProduct[]) {
    const db = await this.initDB();
    const tx = db.transaction(['products', 'metadata'], 'readwrite');

    // Store products
    await Promise.all([
      ...products.map(product => tx.objectStore('products').put(product)),
      tx.objectStore('metadata').put({
        key: 'lastUpdate',
        lastUpdated: new Date().toISOString()
      })
    ]);

    await tx.done;
  }

  async getCachedProducts(): Promise<CanadianProduct[]> {
    const db = await this.initDB();
    return db.getAll('products');
  }

  async searchCachedProducts(searchTerm: string): Promise<CanadianProduct[]> {
    const db = await this.initDB();
    const products = await this.getCachedProducts();
    
    if (!searchTerm.trim()) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.brand_name.toLowerCase().includes(term) ||
      product.products.some(p => p.toLowerCase().includes(term)) ||
      product.categories.some(c => c.toLowerCase().includes(term))
    );
  }

  async isCacheValid(): Promise<boolean> {
    const db = await this.initDB();
    const metadata = await db.get('metadata', 'lastUpdate');
    
    if (!metadata) return false;

    const lastUpdate = new Date(metadata.lastUpdated).getTime();
    const now = new Date().getTime();
    
    return now - lastUpdate < CACHE_DURATION;
  }

  async clearCache() {
    const db = await this.initDB();
    const tx = db.transaction(['products', 'metadata'], 'readwrite');
    
    await Promise.all([
      tx.objectStore('products').clear(),
      tx.objectStore('metadata').clear()
    ]);

    await tx.done;
  }
}

export const cacheService = new CacheService();
