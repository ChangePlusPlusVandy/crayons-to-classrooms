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
  item_limit: number;
  value: number;
  limbo: boolean;
  notes: string;
  name: string;
  stock: number;
};
