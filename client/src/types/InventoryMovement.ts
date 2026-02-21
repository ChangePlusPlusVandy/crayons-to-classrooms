export type InventoryMovement = {
  id?: string;
  inventory_action: 'ADD' | 'MOVE' | 'CHECKOUT' | 'DISCARD' | 'ADJUSTMENT';
  item_id: string;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string;
  quantity: number;
  performed_by: string;
  note?: string;
  performed_at?: string;
};
