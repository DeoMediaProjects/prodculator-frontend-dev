import { useState } from 'react';
import { Box } from '@mui/material';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { PackageComposer } from './PackageComposer';
import { SignalPoolPanel } from './SignalPoolPanel';

type View = 'compose' | 'pool';

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
  const [view, setView] = useState<View>('compose');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <SegmentedToggle
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { value: 'compose', label: 'Compose a package' },
            { value: 'pool', label: 'Signal pool' },
          ]}
        />
      </Box>

      {view === 'compose' ? <PackageComposer /> : <SignalPoolPanel />}
    </Box>
  );
}
