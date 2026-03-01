export type InviteResponse = { message: string } | { error: string };

export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};
