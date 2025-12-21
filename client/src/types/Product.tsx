export type Product = {
  id: string;
  name: string;
  description: string | null;
  unit_of_measure: string | null;
  value: number;
  item_limit: number | null;
  category: string | null;
  total_count: number;
};
