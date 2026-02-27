// src/api/items.ts
import { Item, UpdateItemRequest } from '../types/Item';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Get all items
export async function getItems(): Promise<Item[]> {
  const response = await fetch(`${API_BASE_URL}/items/`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
}

// Get item by ID
export async function getItemById(id: string): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/items/${id}`);
  if (!response.ok) throw new Error('Failed to fetch item');
  return response.json();
}

// Update item (used for REMOVE ITEM feature)
export async function updateItem(itemId: string, data: UpdateItemRequest): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to update item');
  return response.json();
}

// Delete item
export async function deleteItem(itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete item');
}

// Get all warehouses
export async function getWarehouses(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/warehouses`);
  if (!response.ok) throw new Error('Failed to fetch warehouses');
  return response.json();
}
