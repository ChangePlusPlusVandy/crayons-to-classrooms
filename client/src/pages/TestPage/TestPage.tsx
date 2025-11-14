// src/pages/TestPage/TestPage.tsx
import { useEffect, useState } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { getAllTests } from '../../api/tests';
import { Test } from '../../types/Test';
import { TestCard } from './TestPage.styles';

export default function TestPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTests() {
      try {
        const data = await getAllTests();
        setTests(data);
      } catch (err) {
        setError('Failed to load tests.');
      } finally {
        setLoading(false);
      }
    }

    fetchTests();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: { xs: 'center', md: 'left' } }}>
        Test API Page
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {tests.map((test) => (
          <TestCard key={test.id}>
            <Typography variant="h6">{test.message}</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(test.created_at).toLocaleString()}
            </Typography>
          </TestCard>
        ))}

        {!loading && tests.length === 0 && !error && <Typography>No tests found.</Typography>}
      </Box>
    </Container>
  );
}
