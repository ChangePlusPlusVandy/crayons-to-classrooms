// src/types/InventoryMovement.ts

export type InventoryAction = 'ADD' | 'MOVE' | 'CHECKOUT' | 'DISCARD' | 'ADJUSTMENT';

export interface InventoryMovement {
  id: string;
  inventory_action: InventoryAction;

  item_id: string;
  product_id: string;

  from_location_id: string;
  to_location_id: string;

  quantity: number;

  performed_by: string;
  performed_at: string; // ISO timestamp from Postgres

  note: string | null;
}

export interface CreateInventoryMovementRequest {
  inventory_action: InventoryAction;

  item_id: string;
  product_id: string;

  from_location_id: string;
  to_location_id: string;

  quantity: number;

  performed_by: string;
  note?: string;
}

export interface UpdateInventoryMovementRequest {
  inventory_action?: InventoryAction;

  item_id?: string;
  product_id?: string;

  from_location_id?: string;
  to_location_id?: string;

  quantity?: number;

  performed_by?: string;
  performed_at?: string;

  note?: string | null;
}
