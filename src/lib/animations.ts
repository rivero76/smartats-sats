/**
 * UPDATE LOG
 * 2026-03-26 18:30:00 | P19 S1-2: create Framer Motion animation presets for consistent motion system (P19-S1-2)
 */

/**
 * Reusable Framer Motion variants for consistent motion across the app.
 * Import the preset you need and pass it to `variants` on a `<motion.*>` element.
 *
 * Usage:
 *   import { fadeIn } from '@/lib/animations'
 *   <motion.div variants={fadeIn} initial="hidden" animate="visible" />
 *
 * Reduced-motion: Framer Motion respects `prefers-reduced-motion` automatically
 * when using the `useReducedMotion` hook or via `<MotionConfig reducedMotion="user">`.
 */

import type { Variants } from 'framer-motion'

/** Simple opacity fade — use for page mounts and overlays */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
}

/** Fade + subtle upward slide — use for cards, panels, toasts */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: 4, transition: { duration: 0.15, ease: 'easeIn' } },
}

/** Fade + subtle scale — use for modals and dialogs */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: 'easeIn' } },
}

/** Fade + left nudge — use for list items inside a stagger container */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, x: -4, transition: { duration: 0.1, ease: 'easeIn' } },
}

/**
 * Stagger container — wraps a list to animate children sequentially.
 * Pair with `listItem` on each child.
 * Cap stagger at 10 items to avoid long delays on large lists.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

/**
 * Slide in from right — use for sheets and drawers opening from the right.
 * Adjust `x` sign for direction.
 */
export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: 16, transition: { duration: 0.2, ease: 'easeIn' } },
}
