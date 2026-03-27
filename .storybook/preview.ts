/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Storybook preview — import Tailwind CSS, configure dark-mode background,
 *                        enable a11y addon. Uses class-based dark mode matching tailwind.config.ts.
 */
import type { Preview } from '@storybook/react'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#09090b' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Run axe-core on every story
      element: '#storybook-root',
      config: {},
      options: {},
      manual: false,
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
}

export default preview
