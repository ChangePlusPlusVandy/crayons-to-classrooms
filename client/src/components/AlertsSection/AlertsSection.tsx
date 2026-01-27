import { Card, CardContent, Typography, Button, Box, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';
import { alertsSectionStyles } from './AlertsSection.styles';

export default function AlertsSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card sx={alertsSectionStyles.card}>
      <CardContent>
        <Box sx={alertsSectionStyles.header}>
          <Typography variant="body1" sx={{ fontWeight: 400, color: '#8b4513' }}>
            Alerts
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#1a1a2e',
              '&:hover': { bgcolor: '#000' },
              textTransform: 'none',
              fontWeight: 400,
            }}
          >
            Manage Inventory
          </Button>
        </Box>

        <Box sx={alertsSectionStyles.alertItem} onClick={() => setExpanded(!expanded)}>
          <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.85rem' }}>
            3 Low-Stock Items
          </Typography>
          <IconButton
            size="small"
            aria-label={expanded ? 'Collapse low-stock items' : 'Expand low-stock items'}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              color: 'text.secondary',
              p: 0.5,
            }}
          >
            <ExpandMoreIcon sx={{ fontSize: '1.2rem' }} />
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • Crayons - 5 units remaining
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Markers - 3 units remaining
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Paper - 8 units remaining
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
