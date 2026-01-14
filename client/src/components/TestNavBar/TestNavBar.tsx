import { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import LimboRestockPopup from '../LimboRestockPopup/LimboRestockPopup';
import { LimboRestockData } from '../../types/InventoryMovement';

export default function TestNavBar() {
  const [popupOpen, setPopupOpen] = useState(false);

  // Dummy item ID for testing
  const testItemId = '01-01-01';

  const handleOpenPopup = () => {
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  const handleSubmit = async (data: LimboRestockData) => {
    console.log('Restock data submitted:', data);
    // toDo: Implement actual submission logic here
    alert(
      `Restock submitted!
      Quantity: ${data.quantity}
      Warehouse: ${data.warehouseId}
      Fixture: ${data.fixture}
      Slot: ${data.slot}
      Note: ${data.note || 'N/A'}`
    );
  };

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: '#1a1a2e' }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 0 } }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              C2C Test Navigation
            </Typography>
            <Button
              color="inherit"
              variant="outlined"
              onClick={handleOpenPopup}
              sx={{
                borderColor: 'white',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 2, sm: 3 },
              }}
            >
              Test Limbo Restock
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <LimboRestockPopup
        open={popupOpen}
        onClose={handleClosePopup}
        itemId={testItemId}
        onSubmit={handleSubmit}
      />
    </>
  );
}
