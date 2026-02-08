export const activitiesStyles = {
  container: {
    py: 4,
    px: { xs: 2, sm: 3 },
  },
  header: {
    mb: 4,
    fontSize: { xs: '1.5rem', sm: '2rem' },
  },
  tableContainer: {
    bgcolor: 'white',
    borderRadius: 2,
    boxShadow: 1,
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    minWidth: { xs: 600, sm: 650 },
  },
  tableHead: {
    bgcolor: '#e0e0e0',
  },
  tableHeadCell: {
    fontWeight: 600,
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
    color: '#000000',
    borderBottom: '1px solid',
    borderColor: '#bdbdbd',
    px: { xs: 1, sm: 2 },
    whiteSpace: 'nowrap',
  },
  tableRow: {
    '&:hover': {
      bgcolor: '#fafafa',
    },
  },
  tableCell: {
    py: { xs: 1.5, sm: 2 },
    px: { xs: 1, sm: 2 },
    fontSize: { xs: '0.75rem', sm: '0.875rem' },
    borderBottom: '2px solid',
    borderColor: '#e0e0e0',
  },
  actionButton: {
    p: 0.5,
    minWidth: 'auto',
    '&:hover': {
      bgcolor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  actionIcon: {
    width: { xs: 16, sm: 20 },
    height: { xs: 16, sm: 20 },
  },
  viewMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    py: 3,
  },
  viewMoreButton: {
    textTransform: 'none',
    fontWeight: 500,
    px: 3,
  },
} as const;
