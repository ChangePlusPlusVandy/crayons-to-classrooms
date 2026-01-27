export type Item = {
  id: string;
  product_id: string;
  quantity: number;
  current_location_id: string;
  status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
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
  stock: number;
};

// Group of the same item in the same location
export type ItemGroup = {
  current_location_id: string;
  warehouse: string;
  name: string;
  quantity: number; // This is the number of item rows where all the other fields match (same name and location)
};
