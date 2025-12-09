export type Item = {
  id: string;
  product_id: string;
  quantity: number;
  current_location_id: string;
  status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
  created_by: string;
  created_at: string;
  updated_at: string;
};
