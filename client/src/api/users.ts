import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function updateUser(id: string, data: { name?: string }): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body?.error ?? 'Failed to update user');
  }
}
