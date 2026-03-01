import { InviteResponse } from '../types/Auth';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
