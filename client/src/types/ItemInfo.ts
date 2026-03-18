export type ItemInfo = {
  id: string;
  name: string;
  product_id: string | null;
  category: string | null;
  quantity: number | null;
  value: number | null;
  item_limit: number | null;
  stock: number;
  fixture: string | null;
  last_known_location_code: string | null;
  time_last_updated: string | null;
  notes: string | null;
};
