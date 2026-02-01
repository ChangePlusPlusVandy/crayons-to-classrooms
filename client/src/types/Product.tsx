export type Product = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  unit_of_measure: string | null;
  value: number;
  item_limit: string | number;
  category: string;
  total_count: string | number;
};
