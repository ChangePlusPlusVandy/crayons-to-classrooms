import { Card, CardContent, Typography, Box, Button, Avatar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { quickActionsStyles } from './QuickActions.styles';

export default function QuickActions() {
  const actions = [
    {
      icon: <AddIcon />,
      text: 'Add Item',
      borderColor: '#28a745',
      bgColor: '#d4edda',
      iconColor: '#1e7e34',
    },
    {
      icon: <RemoveIcon />,
      text: 'Remove Item',
      borderColor: '#dc3545',
      bgColor: '#f8d7da',
      iconColor: '#a71d2a',
    },
    {
      icon: <ArrowForwardIcon />,
      text: 'Move Pallet',
      borderColor: '#17a2b8',
      bgColor: '#d1ecf1',
      iconColor: '#117a8b',
    },
  ];

  return (
    <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Quick Actions
        </Typography>
        <Box sx={quickActionsStyles.actionsContainer}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outlined"
              sx={{
                ...quickActionsStyles.actionButton,
                bgcolor: 'white',
                borderColor: action.borderColor,
                borderWidth: 2,
                '&:hover': {
                  bgcolor: 'white',
                  borderColor: action.borderColor,
                  borderWidth: 2,
                  opacity: 0.8,
                },
              }}
              startIcon={
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: action.bgColor,
                    color: action.iconColor,
                  }}
                >
                  {action.icon}
                </Avatar>
              }
            >
              {action.text}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
