/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Bootstrap Storybook 8 with react-vite framework, addon-essentials, addon-a11y.
 */
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
}

export default config
