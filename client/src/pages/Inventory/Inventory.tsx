import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import { getWarehouses } from '../../api/warehouse';
import { Warehouse } from '../../types/Warehouse';
import { ItemsTab } from './ItemsTab';
import { LocationsTab } from './LocationsTab';
import { inventoryStyles } from './Inventory.styles';

type TabValue = 'item' | 'location';

export default function Inventory() {
  const [tab, setTab] = useState<TabValue>('item');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    getWarehouses()
      .then(setWarehouses)
      .catch(() => {});
  }, []);

  const handleWarehouseChange = (value: string) => setWarehouseFilter(value);

  return (
    <Container maxWidth="lg" sx={inventoryStyles.container}>
      <Typography variant="h4" sx={inventoryStyles.header}>
        Inventory Management
      </Typography>
      <Typography variant="body2" sx={inventoryStyles.subtitle}>
        Manage inventory items
      </Typography>

      <Box sx={inventoryStyles.tabsBar}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="By Item" value="item" sx={{ textTransform: 'none' }} />
          <Tab label="By Location Code" value="location" sx={{ textTransform: 'none' }} />
        </Tabs>
      </Box>

      <ItemsTab
        active={tab === 'item'}
        warehouseFilter={warehouseFilter}
        warehouses={warehouses}
        onWarehouseChange={handleWarehouseChange}
      />
      <LocationsTab
        active={tab === 'location'}
        warehouseFilter={warehouseFilter}
        warehouses={warehouses}
        onWarehouseChange={handleWarehouseChange}
      />
    </Container>
  );
}
