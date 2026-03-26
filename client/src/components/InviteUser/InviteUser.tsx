import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { inviteAdmin } from '../../api/auth';

export default function InviteUser({ onInviteSuccess }: { onInviteSuccess?: () => void } = {}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      const result = await inviteAdmin(email);
      setStatus({
        type: 'success',
        message: 'message' in result ? result.message : `Invite sent to ${email}`,
      });
      setEmail('');
      onInviteSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite';
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
        />
        {status && <Alert severity={status.type}>{status.message}</Alert>}
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? 'Sending…' : 'Send Invite'}
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Send invite?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            An invite email will be sent to <strong>{email}</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" autoFocus>
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
