import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { PackageComposer } from './PackageComposer';
import { SignalPoolPanel } from './SignalPoolPanel';
import { AdminPanel } from './AdminPanel';

/** Admin workspace for assembling Business Intelligence packages and governing
 *  the signal pool they draw from (SOW 4.4 / 4.5).
 *
 *  The title and purpose line come from the shell's top bar, so nothing is
 *  repeated here. Composing a package is a four-step wizard inside
 *  PackageComposer: dense-single-screen made it too easy to generate a PDF
 *  without running the sufficiency check that decides whether it is worth
 *  sending at all.
 *
 *  Client-facing naming is "Business Intelligence"; the b2b_ prefix stays
 *  internal to code and tables. */
export function BusinessIntelligenceStudio() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Compose a package" />
        <Tab label="Signal pool" />
      </Tabs>

      {tab === 0 && (
        <AdminPanel>
          <PackageComposer />
        </AdminPanel>
      )}
      {tab === 1 && (
        <AdminPanel
          title="Signal pool"
          description="The consented production signals every intelligence product aggregates. Flagging a row as internal removes it from customer-facing aggregation without deleting it."
        >
          <SignalPoolPanel />
        </AdminPanel>
      )}
    </Box>
  );
}
