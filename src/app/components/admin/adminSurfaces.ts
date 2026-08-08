/**
 * The two surface tokens every admin page builds its summary panels from.
 *
 * These were copy-pasted into six screens, which is how the dashboard ended up
 * with a different border radius from every page it sits above. One definition
 * means a change to the console's surfaces cannot apply to five pages and miss
 * the sixth.
 *
 * The radius matches DataTable's card, so a summary panel and the table beneath
 * it read as the same family of surface.
 */
export const PANEL_SX = {
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  borderRadius: '16px',
  p: { xs: 2.5, md: 3 },
} as const;

/** Small caps label above a figure or a section. */
export const EYEBROW_SX = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.16em',
  color: 'text.secondary',
} as const;
