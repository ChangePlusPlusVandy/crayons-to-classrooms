import { Container, Box, MenuItem, Select } from '@mui/material';
import AlertsSection from '../../components/AlertsSection/AlertsSection';
import QuickActions from '../../components/QuickActions/QuickActions';
import InventoryHealthOverview from '../../components/InventoryHealthOverview/InventoryHealthOverview';
import ActivityLog from '../../components/ActivityLog/ActivityLog';

export default function Dashboard() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Warehouse Selector */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'flex-end',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: 4,
          gap: 2,
        }}
      >
        <Select
          value="woodman"
          aria-label="Select warehouse"
          sx={{
            minWidth: 200,
            bgcolor: 'background.paper',
          }}
        >
          <MenuItem value="woodman">Woodman Warehouse</MenuItem>
          <MenuItem value="downtown">Downtown Warehouse</MenuItem>
        </Select>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        {/* Left Column - Alerts and Quick Actions */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 66%' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <AlertsSection />
            <QuickActions />
            <InventoryHealthOverview />
          </Box>
        </Box>

        {/* Right Column - Activity Log */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33%' } }}>
          <ActivityLog />
        </Box>
      </Box>
    </Container>
  );
}
