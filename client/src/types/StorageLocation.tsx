export type StorageLocation = {
  id: string;
  aisle: string;
  fixture: string;
  slot: string;
  location_code: string;
  active: boolean;
  extra_info: string | null;
  warehouse_id: string;
  created_at: string;
};
