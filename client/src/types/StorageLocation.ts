export type StorageLocation = {
  id: string;
  aisle: string;
  slot: string;
  fixture: string | null;
  location_code: string;
  active: boolean;
  extra_info: string | null;
  warehouse_id: string;
  created_at: string;
};
