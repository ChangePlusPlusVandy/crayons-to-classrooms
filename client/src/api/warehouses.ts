const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export type Warehouse = {
  id: string;
  name: string;
  address: string | null;
};

export async function getAllWarehouses(): Promise<Warehouse[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/warehouse`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to fetch warehouses');
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
