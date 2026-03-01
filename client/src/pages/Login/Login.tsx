import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  };

  const goToForgot = () => {
    setView('forgot');
    setError(null);
  };

  const goToLogin = () => {
    setView('login');
    setError(null);
    setResetSent(false);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: '#f5f5f5' }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={1} textAlign="center">
          Crayons to Classrooms
        </Typography>

        {view === 'login' && (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="current-password"
            />
            <Box display="flex" justifyContent="flex-end">
              <Button size="small" variant="text" onClick={goToForgot} sx={{ mt: 0.5 }}>
                Forgot password?
              </Button>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        )}

        {view === 'forgot' && (
          <>
            <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
              Enter your email and we'll send you a reset link.
            </Typography>
            {resetSent ? (
              <Alert severity="success">Check your email for a reset link.</Alert>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="email"
                />
                {error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {error}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>
            )}
            <Box display="flex" justifyContent="center" mt={2}>
              <Button size="small" variant="text" onClick={goToLogin}>
                Back to Sign In
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
