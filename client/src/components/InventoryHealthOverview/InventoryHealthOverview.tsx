import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material';
import { getInventoryStats, InventoryStats } from '../../api/itemInfo';

export default function InventoryHealthOverview() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInventoryStats()
      .then(setStats)
      .catch((err) => {
        console.error('Failed to load inventory stats:', err);
        setError('Failed to load inventory stats');
      })
      .finally(() => setLoading(false));
  }, []);

  const filledSlots = stats ? stats.occupied_slots : 0;
  const filledPct =
    stats && stats.total_slots > 0 ? Math.round((filledSlots / stats.total_slots) * 100) : 0;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Inventory Health Overview
      </Typography>

      <Box>
        {/* % Slots Filled */}
        <Box sx={{ display: 'flex' }}>
          <Card sx={{ boxShadow: 1, borderRadius: 2, flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                % Slots Filled
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              ) : (
                <>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    {filledPct}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={filledPct}
                    sx={{
                      mb: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {filledSlots.toLocaleString()} / {stats!.total_slots.toLocaleString()} slots
                    filled
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
