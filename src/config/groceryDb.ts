import Dexie, { Table } from 'dexie';

export interface GroceryItem {
  id: string;
  name: string;
  category?: string;
  typicalPrice?: number;
  preferredStore?: string;
  checked?: boolean;
  order?: number;
  cost?: number;
  barcode?: string;
  canadianProductId?: string; // Reference to CanadianProduct
}

export interface GroceryList {
  id?: number;
  userId: string;
  name: string;
  date: number;
  items: GroceryItem[];
}

export interface GroceryPreference {
  id?: number;
  userId: string;
  quickNotes?: string[];
  categories?: { title: string; items: string[] }[];
  title: string;
  items: GroceryItem[];
  canadianProducts?: string[]; // Array of Canadian product IDs
}

class GroceryDatabase extends Dexie {
  groceryLists!: Table<GroceryList, number>;
  groceryPreferences!: Table<GroceryPreference, number>;

  constructor() {
    super('groceryDb');
    this.version(1).stores({
      groceryLists: '++id, userId, name, date',
      groceryPreferences: '++id, userId, title'
    });
  }
}

export const groceryDb = new GroceryDatabase();
