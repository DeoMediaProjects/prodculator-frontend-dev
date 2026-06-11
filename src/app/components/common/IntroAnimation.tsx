import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import logo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

const GOLD = '#D4AF37';
const SESSION_KEY = 'prodculator_intro_played';
const LOGO_WIDTH = 260;

// Cinematic ease (custom cubic-beziers reused across the sequence).
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

const stroke = (delay: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { pathLength: { delay, duration: 0.8, ease: EASE_IN_OUT }, opacity: { delay, duration: 0.2 } },
});

/**
 * Full-screen brand intro shown once per browser session on the landing page.
 * Phase 1: a from-scratch SVG rings-mark draws + assembles in gold.
 * Phase 2: it cross-fades into the real Prodculator wordmark with a gold
 *          light-sweep and an underline draw.
 * Phase 3: the black overlay wipes upward to reveal the page.
 * Click anywhere to skip; respects prefers-reduced-motion.
 */
export function IntroAnimation() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage.getItem(SESSION_KEY) !== '1',
  );

  useEffect(() => {
    if (!visible) return;
    window.sessionStorage.setItem(SESSION_KEY, '1');
    const lifetime = reduceMotion ? 1000 : 3100;
    const timer = window.setTimeout(() => setVisible(false), lifetime);
    return () => window.clearTimeout(timer);
  }, [visible, reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="presentation"
          aria-hidden
          initial={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: '-100%' }}
          transition={{ duration: reduceMotion ? 0.4 : 0.85, ease: EASE_IN_OUT }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Gold atmospheric glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.75, 0.45], scale: [0.6, 1.1, 1] }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 520,
              height: 520,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0) 65%)`,
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />

          {/* Stage: animated mark resolves into the real wordmark */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 150,
            }}
          >
            {/* Phase 1 — from-scratch SVG rings-mark */}
            {!reduceMotion && (
              <motion.svg
                viewBox="0 0 100 100"
                width={118}
                height={118}
                fill="none"
                style={{ position: 'absolute' }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0, scale: 0.85 }}
                transition={{ delay: 1.25, duration: 0.45, ease: 'easeIn' }}
              >
                <motion.g
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  initial={{ rotate: -120, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 1.1, ease: EASE_OUT_EXPO }}
                  stroke={GOLD}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  <motion.circle cx="50" cy="50" r="46" {...stroke(0)} />
                  <motion.ellipse cx="50" cy="50" rx="15" ry="30" transform="rotate(28 50 50)" {...stroke(0.15)} />
                  <motion.ellipse cx="50" cy="50" rx="15" ry="30" transform="rotate(-28 50 50)" {...stroke(0.3)} />
                  <motion.line x1="22" y1="50" x2="78" y2="50" {...stroke(0.45)} />
                </motion.g>
              </motion.svg>
            )}

            {/* Phase 2 — real Prodculator wordmark (inverted to read on black) */}
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.18, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ delay: reduceMotion ? 0 : 1.3, duration: 0.6, ease: 'easeOut' }}
              style={{ position: 'relative', width: LOGO_WIDTH }}
            >
              <img
                src={logo}
                alt="Prodculator"
                style={{ width: LOGO_WIDTH, height: 'auto', display: 'block', filter: 'invert(1)' }}
              />

              {/* Gold light-sweep, masked to the logo glyphs */}
              {!reduceMotion && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    WebkitMaskImage: `url(${logo})`,
                    maskImage: `url(${logo})`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <motion.div
                    initial={{ x: '-120%' }}
                    animate={{ x: '120%' }}
                    transition={{ delay: 1.9, duration: 0.85, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(100deg, transparent 42%, ${GOLD} 50%, transparent 58%)`,
                    }}
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Underline draw */}
          {!reduceMotion && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.95, duration: 0.6, ease: EASE_OUT_EXPO }}
              style={{
                marginTop: 24,
                width: 220,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                transformOrigin: 'center',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
