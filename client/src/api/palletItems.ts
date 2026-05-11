import { z } from 'zod';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PalletItemSummarySchema = z.object({
  name: z.string(),
  total_quantity: z.number().int(),
});

const PalletItemsResponseSchema = z.object({
  items: z.array(PalletItemSummarySchema),
});

export type PalletItemSummary = z.infer<typeof PalletItemSummarySchema>;

export async function getPalletItems(movementId: string): Promise<PalletItemSummary[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${movementId}/pallet-items`);
  if (!response.ok) throw new Error('Failed to fetch pallet items');
  const { items } = PalletItemsResponseSchema.parse(await response.json());
  return items;
}
