import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { AuthCard } from '../Login/Login.styles';
import { supabase } from '../../supabaseClient';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [isReset, setIsReset] = useState(false);

  useEffect(() => {
    // Supabase exchanges the invite/reset token from the URL hash into a session automatically.
    // Wait for the auth state to settle before showing the form.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReset(true);
        setReady(true);
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard', {
        replace: true,
        state: {
          message: isReset
            ? 'Password reset successfully.'
            : 'Password set. Welcome to Crayons to Classrooms!',
          alertType: 'success',
        },
      });
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: 'background.default' }}
    >
      <AuthCard elevation={3}>
        <Typography variant="h5" fontWeight="bold" mb={1} textAlign="center">
          {isReset ? 'Reset Your Password' : 'Set Your Password'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
          {isReset
            ? 'Enter a new password for your account.'
            : 'Choose a password to complete your account setup.'}
        </Typography>
        {!ready && (
          <Alert severity="info">
            {isReset ? 'Verifying your reset link…' : 'Verifying your invite link…'}
          </Alert>
        )}
        {ready && (
          <form onSubmit={handleSubmit}>
            <TextField
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="new-password"
              slotProps={{ htmlInput: { minLength: 6 } }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 3 }}>
              {loading ? 'Setting password…' : isReset ? 'Reset Password' : 'Set Password'}
            </Button>
          </form>
        )}
      </AuthCard>
    </Box>
  );
}
