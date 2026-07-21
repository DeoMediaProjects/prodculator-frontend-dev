import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Tooltip } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

export interface Segment {
  value: string;
  label?: ReactNode;
  icon?: ReactNode;
  locked?: boolean;
  lockedHint?: string;
}

interface Palette {
  bg: string;
  border: string;
  activeBg: string;
  activeText: string;
  inactiveText: string;
}

interface Props {
  options: Segment[];
  value: string;
  onChange: (value: string) => void;
  onLocked?: (value: string) => void;
  /** Override colors for non-theme-aware surfaces (e.g. the public calculator). */
  palette?: Palette;
  size?: 'sm' | 'md';
  fontFamily?: string;
  radius?: number;
}

// iOS-style segmented control: a single highlight pill slides between segments
// with a spring-ish easing. The pill is MEASURED against the active segment so
// it aligns perfectly regardless of differing label widths.
export function SegmentedToggle({ options, value, onChange, onLocked, palette, size = 'md', fontFamily, radius = 10 }: Props) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const pal: Palette = palette ?? {
    bg: t.inputBg,
    border: t.border,
    activeBg: t.gold,
    activeText: mode === 'dark' ? '#1C1A16' : '#fff',
    inactiveText: t.textSecondary,
  };

  const pad = 3;
  const py = size === 'sm' ? 0.5 : 0.9;
  const px = size === 'sm' ? 1.5 : 2.25;
  const fontSize = size === 'sm' ? 12 : 13;
  const innerRadius = Math.max(4, radius - 3);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({ left: pad, width: 0, ready: false });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector('[data-seg-active="true"]') as HTMLElement | null;
      if (active) setPill({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.map((o) => o.value).join('|')]);

  return (
    <Box
      ref={containerRef}
      role="tablist"
      sx={{
        position: 'relative', display: 'inline-flex', p: `${pad}px`,
        bgcolor: pal.bg, border: `1px solid ${pal.border}`, borderRadius: `${radius}px`,
      }}
    >
      {/* Sliding highlight */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute', top: pad, bottom: pad, left: 0,
          width: pill.width, transform: `translateX(${pill.left}px)`,
          bgcolor: pal.activeBg, borderRadius: `${innerRadius}px`,
          opacity: pill.ready ? 1 : 0,
          // Animate only transform (GPU-composited, no layout thrash); width snaps.
          transition: pill.ready ? 'transform .34s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
          boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.12)',
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        const content = (
          <Box
            key={o.value}
            role="tab"
            data-seg-active={active}
            aria-selected={active}
            onClick={() => (o.locked ? onLocked?.(o.value) : onChange(o.value))}
            sx={{
              position: 'relative', zIndex: 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.6,
              px, py, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
              fontFamily: fontFamily || 'inherit', fontSize, lineHeight: 1.2,
              fontWeight: active ? 700 : 500,
              color: active ? pal.activeText : o.locked ? t.textFaint : pal.inactiveText,
              transition: 'color .2s ease',
            }}
          >
            {o.icon}
            {o.label}
            {o.locked && <LockOutlined sx={{ fontSize: 13 }} />}
          </Box>
        );
        return o.locked && o.lockedHint ? (
          <Tooltip key={o.value} title={o.lockedHint} arrow>{content}</Tooltip>
        ) : content;
      })}
    </Box>
  );
}
