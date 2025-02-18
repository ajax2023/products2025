import React, { useState } from "react";
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper 
} from "@mui/material";
import Features from "./Features";
import AboutUs from "./AboutUs";
import SupportUs from "./SupportUs";

export default function Dashboard() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
  };

  return (
    <Box sx={{ 
      width: "95%",
      height: 'calc(100vh - 114px)',
      position: 'fixed',
      top: 50, 
      left: 0, 
      right: 0,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      pb: 7 // space for footer
    }}>
      <Paper elevation={10} sx={{ mb: 2, flex: 'none' }}>
        <Tabs value={tabIndex} onChange={handleChange} variant="fullWidth">
        <Tab label="Features" />
        <Tab label="About Us" />
        <Tab label="Support us" />
          
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        pb: 2
      }}>
        {tabIndex === 0 && <Features />}
        {tabIndex === 1 && <AboutUs />}
        {tabIndex === 2 && <SupportUs />}
      </Box>
    </Box>
  );
}
