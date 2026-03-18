// src/api/items.ts
import { Item, UpdateItemRequest } from '../types/Item';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Get all items
export async function getItems(): Promise<Item[]> {
  const response = await authFetch(`${API_BASE_URL}/items/`);
  if (!response.ok) throw new Error('Failed to authFetch items');
  return response.json();
}

// Get item by ID
export async function getItemById(id: string): Promise<Item> {
  const response = await authFetch(`${API_BASE_URL}/items/${id}`);
  if (!response.ok) throw new Error('Failed to authFetch item');
  return response.json();
}

// Update item (used for REMOVE ITEM feature)
export async function updateItem(itemId: string, data: UpdateItemRequest): Promise<Item> {
  const response = await authFetch(`${API_BASE_URL}/items/${itemId}`, {
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
  const response = await authFetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete item');
}
