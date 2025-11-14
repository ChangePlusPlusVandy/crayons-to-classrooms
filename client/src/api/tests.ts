import { Test } from '../types/Test';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getAllTests(): Promise<Test[]> {
  const response = await fetch(`${API_BASE_URL}/test/`);
  if (!response.ok) throw new Error('Failed to fetch tests');
  return response.json();
}
