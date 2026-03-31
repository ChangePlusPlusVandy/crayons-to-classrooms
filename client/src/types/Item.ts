export type Item = {
  id: string;
  /** FK to item_info when present */
  item_info?: string | null;
  product_id: string;
  quantity: number;
  current_location_id: string;
  status: 'active' | 'inactive' | 'discontinued' | 'checked_out' | 'donated' | 'defective';
  created_by: string;
  created_at: string;
  updated_at: string;
  warehouse: string;
  category: string;
  item_limit: number | string; // It is a bigint in db schema so node-postgres currently returns it as a string
  value: number;
  limbo: boolean;
  notes: string;
  name: string;
  stock?: number;
};

// Group of the same item in the same location
export type ItemGroup = {
  current_location_id: string;
  warehouse: string;
  name: string;
  product_id: string;
  quantity: number; // This is the number of item rows where all the other fields match (same name and location)
};

export interface UpdateItemRequest {
  quantity?: number;
  status?: 'active' | 'inactive' | 'discontinued' | 'checked_out';
  current_location_id?: string | null;
  warehouse?: string | null;
  limbo?: boolean;
  notes?: string;
}
