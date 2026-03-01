import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { getUsers, removeUser } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import InviteUser from '../../components/InviteUser/InviteUser';
import { AdminUser } from '../../types/Auth';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('fetching users again')
      setUsers(await getUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRemove = async (id: string) => {
    setConfirmDelete(null);
    setRemoving((prev) => new Set(prev).add(id));
    try {
      await removeUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      fetchUsers();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Manage Users
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Invite User
        </Typography>
        <InviteUser onInviteSuccess={fetchUsers} />
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 2 }} elevation={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Current Users
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : (
          <List disablePadding>
            {[...users].sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0)).map((adminUser, index) => (
              <React.Fragment key={adminUser.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    adminUser.id !== user?.id ? (
                      <IconButton
                        edge="end"
                        aria-label={`Remove ${adminUser.email}`}
                        onClick={() => setConfirmDelete(adminUser)}
                        disabled={removing.has(adminUser.id)}
                        size="small"
                        sx={{
                          '&:hover': { color: 'error.main' },
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={adminUser.id === user?.id ? `${adminUser.email} (you)` : adminUser.email}
                    secondary={`Joined ${new Date(adminUser.created_at).toLocaleDateString()}`}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Remove admin?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{confirmDelete?.email}</strong> will be removed and logged out immediately. Their data will be preserved.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            onClick={() => confirmDelete && handleRemove(confirmDelete.id)}
            color="error"
            variant="contained"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
