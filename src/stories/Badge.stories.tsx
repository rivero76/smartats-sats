/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Badge stories — all variants + dark mode.
 */
import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '@/components/ui/badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
    children: { control: 'text' },
  },
  args: {
    children: 'Badge',
    variant: 'default',
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary' },
}

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Error' },
}

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline' },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['default', 'secondary', 'destructive', 'outline'] as const).map((v) => (
        <Badge key={v} variant={v}>
          {v}
        </Badge>
      ))}
    </div>
  ),
}

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">Completed</Badge>
      <Badge variant="secondary">Processing</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Beta</Badge>
    </div>
  ),
}
