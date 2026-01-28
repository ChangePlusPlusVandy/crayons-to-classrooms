import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';

export default function InventoryHealthOverview() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Inventory Health Overview
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, display: 'flex' }}>
          <Card sx={{ boxShadow: 1, borderRadius: 2, flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total SKUs
              </Typography>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                1,240
              </Typography>
              <LinearProgress
                variant="determinate"
                value={82}
                sx={{
                  mb: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#2c2c3e',
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                1,240 / 1,500 stocked (82%)
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, display: 'flex' }}>
          <Card sx={{ boxShadow: 1, borderRadius: 2, flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                % Stocked
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 100,
                }}
              >
                {/* Empty - to be populated later */}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
