import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { sidebarStyles, drawerWidth } from './Sidebar.styles';

interface SidebarProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
  { text: 'Activity Log', icon: <TimelineIcon />, path: '/activity-log' },
  { text: 'Limbo Items', icon: <WarningIcon />, path: '/limbo-items' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar({ mobileOpen, onDrawerToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Sync selectedIndex with current route
  useEffect(() => {
    const currentIndex = menuItems.findIndex(item => item.path === location.pathname);
    if (currentIndex !== -1) {
      setSelectedIndex(currentIndex);
    }
  }, [location.pathname]);

  const handleListItemClick = (index: number, path: string) => {
    setSelectedIndex(index);
    navigate(path);
    // Close mobile drawer when item is clicked
    if (mobileOpen) {
      onDrawerToggle();
    }
  };

  const drawerContent = (
    <Box sx={sidebarStyles.container}>
      {/* Header */}
      <Box sx={sidebarStyles.header}>
        <Typography variant="h5">Crayons to</Typography>
        <Typography variant="h5">Classrooms</Typography>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item, index) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={selectedIndex === index}
              onClick={() => handleListItemClick(index, item.path)}
              sx={sidebarStyles.listItemButton}
            >
              <ListItemIcon
                sx={{ color: selectedIndex === index ? 'primary.main' : 'inherit', minWidth: 40 }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* User Profile Section */}
      <Box sx={sidebarStyles.userSection}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Admin John Smith
          </Typography>
        </Box>
        <KeyboardArrowDownIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer - Temporary */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer - Persistent */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
