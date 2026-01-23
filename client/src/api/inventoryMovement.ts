// src/api/inventoryMovement.ts
import {
  InventoryMovement,
  CreateInventoryMovementRequest,
  UpdateInventoryMovementRequest,
} from '../types/InventoryMovement';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const API_BASE_URL = 'http://localhost:5001/api/inventory-movement';

// Get all inventory movements
export async function getInventoryMovements(): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/`);
  if (!response.ok) throw new Error('Failed to fetch inventory movements');
  return response.json();
}

// Get inventory movement by ID
export async function getInventoryMovementById(id: string): Promise<InventoryMovement> {
  const response = await fetch(`${API_BASE_URL}/${id}`);
  if (!response.ok) throw new Error('Failed to fetch inventory movement');
  return response.json();
}

// Get movements by action
export async function getMovementsByAction(inventoryAction: string): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/action/${inventoryAction}`);
  if (!response.ok) throw new Error('Failed to fetch movements by action');
  return response.json();
}

// Get movements by item ID
export async function getMovementsByItemId(itemId: string): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/item/${itemId}`);
  if (!response.ok) throw new Error('Failed to fetch movements by item ID');
  return response.json();
}

// Get movements by product ID
export async function getMovementsByProductId(productId: string): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/product/${productId}`);
  if (!response.ok) throw new Error('Failed to fetch movements by product ID');
  return response.json();
}

// Get movements by start location ID
export async function getMovementsByStartLocationId(
  startLocationId: string
): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/start-location/${startLocationId}`);
  if (!response.ok) throw new Error('Failed to fetch movements by start location');
  return response.json();
}

// Get movements by end location ID
export async function getMovementsByEndLocationId(
  endLocationId: string
): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/end-location/${endLocationId}`);
  if (!response.ok) throw new Error('Failed to fetch movements by end location');
  return response.json();
}

// Get movements by performed-by ID
export async function getMovementsByPerformedById(
  performedById: string
): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/performed-by/${performedById}`);
  if (!response.ok) throw new Error('Failed to fetch movements by performed-by ID');
  return response.json();
}

// Get movements on and before date
export async function getMovementsOnAndBeforeDate(date: string): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/before/${date}`);
  if (!response.ok) throw new Error('Failed to fetch movements before date');
  return response.json();
}

// Get movements on and after date
export async function getMovementsOnAndAfterDate(date: string): Promise<InventoryMovement[]> {
  const response = await fetch(`${API_BASE_URL}/after/${date}`);
  if (!response.ok) throw new Error('Failed to fetch movements after date');
  return response.json();
}

// Create inventory movement
export async function createInventoryMovement(
  data: CreateInventoryMovementRequest
): Promise<InventoryMovement> {
  const response = await fetch(`${API_BASE_URL}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create inventory movement');
  return response.json();
}

// Update inventory movement
export async function updateInventoryMovement(
  id: string,
  data: UpdateInventoryMovementRequest
): Promise<InventoryMovement> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to update inventory movement');
  return response.json();
}

// Delete inventory movement
export async function deleteInventoryMovement(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete inventory movement');
}
