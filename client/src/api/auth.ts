import { AdminUser, InviteResponse } from '../types/Auth';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getUsers(): Promise<AdminUser[]> {
  const response = await authFetch(`${API_BASE_URL}/auth/users`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? 'Failed to fetch users');
  return data;
}

export async function removeUser(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/auth/users/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data?.error ?? 'Failed to remove user');
  }
}

export async function inviteAdmin(email: string): Promise<InviteResponse> {
  const response = await authFetch(`${API_BASE_URL}/auth/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();

  if (!response.ok) throw new Error(data?.error ?? 'Failed to invite user');
  
  return data;
}
