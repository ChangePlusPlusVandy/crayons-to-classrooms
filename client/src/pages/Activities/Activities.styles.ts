export const activitiesStyles = {
  container: {
    maxWidth: 'lg',
    py: 4,
  },
  header: {
    mb: 4,
  },
  tableContainer: {
    bgcolor: 'white',
    borderRadius: 2,
    boxShadow: 1,
    overflow: 'hidden',
  },
  table: {
    minWidth: 650,
  },
  tableHead: {
    bgcolor: '#e0e0e0',
  },
  tableHeadCell: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#000000',
    borderBottom: '1px solid',
    borderColor: '#bdbdbd',
  },
  tableRow: {
    '&:hover': {
      bgcolor: '#fafafa',
    },
  },
  tableCell: {
    py: 2,
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
    width: 20,
    height: 20,
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
