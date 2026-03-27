/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Input stories — default, with label, disabled, error state, dark mode.
 */
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    type: 'text',
    placeholder: 'Enter text…',
    disabled: false,
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="name">Full Name</Label>
      <Input id="name" placeholder="e.g. Jane Doe" />
    </div>
  ),
}

export const Email: Story = {
  args: { type: 'email', placeholder: 'you@example.com' },
}

export const Password: Story = {
  args: { type: 'password', placeholder: '••••••••' },
}

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled input' },
}

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email-error">Email</Label>
      <Input
        id="email-error"
        type="email"
        placeholder="you@example.com"
        className="border-destructive focus-visible:ring-destructive"
        aria-describedby="email-error-msg"
      />
      <p id="email-error-msg" className="text-sm text-destructive">
        Please enter a valid email address.
      </p>
    </div>
  ),
}

export const Search: Story = {
  args: { type: 'search', placeholder: 'Search resumes…' },
}
