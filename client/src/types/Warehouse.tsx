// src/types/Warehouse.tsx

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseRequest {
  name: string;
  address: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  address?: string;
}
