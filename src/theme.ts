import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  components: {
    MuiGrid: {
      styleOverrides: {
        root: {
          padding: '0px',
          margin: '0px',
          // Base styles for all Grid components
        },
        container: {
          // Styles for Grid container
          padding: '0px',
          margin: '0 auto',
          maxWidth: '98%',  // This will match your current Box width settings
          
        },
        item: {
          // Styles for Grid items
          padding: '0px',
          
        },
      },
      defaultProps: {
        // Default props for all Grid components
        disableGutters: false,  // Enable gutters by default
        
      },
      variants: [
        {
          props: { container: true },
          style: {
            // Additional styles for containers
          },
        },
        {
          props: { item: true },
          style: {
            // Additional styles for items
          },
        },
      ],
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          padding: '8px 14px',
          '&:focus': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          transform: 'translate(14px, 9px) scale(1)',
          '&.Mui-focused': {
            transform: 'translate(14px, -9px) scale(0.75)',
          },
          '&.MuiInputLabel-shrink': {
            transform: 'translate(14px, -9px) scale(0.75)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.23)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.87)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976d2',
          },
        },
        input: {
          padding: '8px 14px',
        },
      },
    },
  },
});
