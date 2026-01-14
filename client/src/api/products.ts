import { Product } from '../types/InventoryMovement';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getProductById(productId: string): Promise<Product> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/product/${productId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
