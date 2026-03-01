import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { supabaseAdmin } from '../supabase.js';

const INVITE_REDIRECT_URL = process.env.INVITE_REDIRECT_URL ?? 'http://localhost:3000/set-password';

/**
 * Handles Zod validation errors and sends appropriate error response
 * @param error - The error object
 * @param res - The Express response object
 * @returns {Promise<Response>} Error message
 */
const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }
  console.error('Unexpected error:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

const inviteUserSchema = z.object({
  email: z.email(),
});

export async function listUsers(_req: Request, res: Response): Promise<Response> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: error.message });
  const users = data.users.map(({ id, email, created_at, last_sign_in_at }) => ({
    id,
    email,
    created_at,
    last_sign_in_at,
  }));
  return res.json(users);
}

export async function removeUser(req: Request, res: Response): Promise<Response> {
  if (req.params.id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot remove your own account' });
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
}

export async function inviteUser(req: Request, res: Response): Promise<Response> {
  try {
    const { email } = inviteUserSchema.parse(req.body);

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: INVITE_REDIRECT_URL,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ message: `Invite sent to ${email}` });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error inviting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
