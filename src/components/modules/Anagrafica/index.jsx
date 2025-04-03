import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, useTheme } from '@mui/material';
import ImportSection from './ImportSection';
import DataTable from './DataTable';

const Anagrafica = () => {
    const [activeTab, setActiveTab] = useState(0);
    const theme = useTheme();

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                overflow: 'hidden'
            }}
        >
            {/* Tabs Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    aria-label="anagrafica tabs"
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label="VISUALIZZA DATI" id="tab-0" />
                    <Tab label="IMPORTA" id="tab-1" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            <Box
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    overflow: 'hidden',
                    bgcolor: 'background.default'
                }}
            >
                {/* I componenti sono nascosti invece che smontati per preservare lo stato */}
                <Box
                    role="tabpanel"
                    hidden={activeTab !== 0}
                    id="tabpanel-0"
                    aria-labelledby="tab-0"
                    sx={{ 
                        width: '100%', 
                        height: '100%', 
                        display: activeTab !== 0 ? 'none' : 'flex' 
                    }}
                >
                    <DataTable />
                </Box>
                
                <Box
                    role="tabpanel"
                    hidden={activeTab !== 1}
                    id="tabpanel-1"
                    aria-labelledby="tab-1"
                    sx={{ 
                        width: '100%', 
                        height: '100%',
                        display: activeTab !== 1 ? 'none' : 'flex'
                    }}
                >
                    <ImportSection />
                </Box>
            </Box>
        </Box>
    );
};

export default Anagrafica;