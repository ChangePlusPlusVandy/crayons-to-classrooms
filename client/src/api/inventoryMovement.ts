// src/api/inventoryMovement.ts
import { z } from 'zod';
import { InventoryMovement, InventoryMovementSchema } from '../types/InventoryMovement';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CreateInventoryMovementRequestSchema = InventoryMovementSchema.omit({
  id: true,
  performed_at: true,
}).extend({
  performed_by: z.string(),
  from_location_id: z.string().nullable().optional(),
  to_location_id: z.string().nullable().optional(),
});

const UpdateInventoryMovementRequestSchema = InventoryMovementSchema.omit({
  id: true,
})
  .partial()
  .extend({
    performed_by: z.string().nullable().optional(),
    from_location_id: z.string().nullable().optional(),
    to_location_id: z.string().nullable().optional(),
  });

type CreateInventoryMovementRequest = z.input<typeof CreateInventoryMovementRequestSchema>;
type UpdateInventoryMovementRequest = z.input<typeof UpdateInventoryMovementRequestSchema>;

// Get all inventory movements
export async function getInventoryMovements(): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement`);
  if (!response.ok) throw new Error('Failed to authFetch inventory movements');
  return response.json();
}

// Get inventory movement by ID
export async function getInventoryMovementById(id: string): Promise<InventoryMovement> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${id}`);
  if (!response.ok) throw new Error('Failed to authFetch inventory movement');
  return response.json();
}

// Get movements by action
export async function getMovementsByAction(inventoryAction: string): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/action/${inventoryAction}`);
  if (!response.ok) throw new Error('Failed to authFetch movements by action');
  return response.json();
}

// Get movements by item ID
export async function getMovementsByItemId(itemId: string): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/item/${itemId}`);
  if (!response.ok) throw new Error('Failed to authFetch movements by item ID');
  return response.json();
}

// Get movements by product ID
export async function getMovementsByProductId(productId: string): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/product/${productId}`);
  if (!response.ok) throw new Error('Failed to authFetch movements by product ID');
  return response.json();
}

// Get movements by start location ID
export async function getMovementsByStartLocationId(
  startLocationId: string
): Promise<InventoryMovement[]> {
  const response = await authFetch(
    `${API_BASE_URL}/inventory-movement/start-location/${startLocationId}`
  );
  if (!response.ok) throw new Error('Failed to authFetch movements by start location');
  return response.json();
}

// Get movements by end location ID
export async function getMovementsByEndLocationId(
  endLocationId: string
): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/end-location/${endLocationId}`);
  if (!response.ok) throw new Error('Failed to authFetch movements by end location');
  return response.json();
}

// Get movements by performed-by ID
export async function getMovementsByPerformedById(
  performedById: string
): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/performed-by/${performedById}`);
  if (!response.ok) throw new Error('Failed to authFetch movements by performed-by ID');
  return response.json();
}

// Get movements on and before date
export async function getMovementsOnAndBeforeDate(date: string): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/before/${date}`);
  if (!response.ok) throw new Error('Failed to authFetch movements before date');
  return response.json();
}

// Get movements on and after date
export async function getMovementsOnAndAfterDate(date: string): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/after/${date}`);
  if (!response.ok) throw new Error('Failed to authFetch movements after date');
  return response.json();
}

// Create inventory movement
export async function createInventoryMovement(
  data: CreateInventoryMovementRequest
): Promise<InventoryMovement> {
  const payload = CreateInventoryMovementRequestSchema.parse(data);
  const response = await authFetch(`${API_BASE_URL}/inventory-movement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to create inventory movement');
  const responseData = await response.json();
  return InventoryMovementSchema.parse(responseData);
}

// Update inventory movement
export async function updateInventoryMovement(
  id: string,
  data: UpdateInventoryMovementRequest
): Promise<InventoryMovement> {
  const payload = UpdateInventoryMovementRequestSchema.parse(data);
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to update inventory movement');
  const responseData = await response.json();
  return InventoryMovementSchema.parse(responseData);
}

// Delete inventory movement
export async function deleteInventoryMovement(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete inventory movement');
}
