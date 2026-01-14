export type InventoryAction = 'ADD' | 'MOVE' | 'CLOCKOUT' | 'DISCARD' | 'ADJUSTMENT';

export type InventoryMovement = {
  id: string;
  inventory_action: InventoryAction;
  item_id: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  performed_by: string;
  performed_at: string;
  note: string | null;
};

export type StorageLocation = {
  id: string;
  aisle: string;
  fixture: string;
  location_code: string;
  active: boolean;
  extra_info: string | null;
  warehouse_id: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
};

export type LimboRestockData = {
  quantity: number;
  warehouseId: string;
  fixture: string;
  slot: string; // Maps to "aisle" in database
  note?: string;
};
