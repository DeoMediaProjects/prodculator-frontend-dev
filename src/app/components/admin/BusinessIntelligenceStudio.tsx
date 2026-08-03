import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { PackageComposer } from './PackageComposer';
import { SignalPoolPanel } from './SignalPoolPanel';

/** Admin workspace for assembling Business Intelligence packages and governing
 *  the signal pool they draw from (SOW 4.4 / 4.5).
 *
 *  Client-facing naming is "Business Intelligence"; the b2b_ prefix stays
 *  internal to code and tables. */
export function BusinessIntelligenceStudio() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Business Intelligence Studio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Compose bespoke packages, check sufficiency before anything is generated,
        and govern the signal pool.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Package composer" />
        <Tab label="Signal pool" />
      </Tabs>

      {tab === 0 && <PackageComposer />}
      {tab === 1 && <SignalPoolPanel />}
    </Box>
  );
}
