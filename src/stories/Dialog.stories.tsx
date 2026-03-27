/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Dialog stories — default open, with form, destructive confirm.
 */
import type { Meta, StoryObj } from '@storybook/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    // Render dialogs open by default in Storybook so they're visible without interaction
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Dialog>

export const Default: Story = {
  render: () => (
    <Dialog open>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dialog-name" className="text-right">
              Name
            </Label>
            <Input id="dialog-name" defaultValue="Jane Doe" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const Confirmation: Story = {
  render: () => (
    <Dialog open>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Resume?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The resume and all associated analyses will be permanently
            deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Dialog open>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Resume Profile</DialogTitle>
          <DialogDescription>Define a persona to target a specific role family.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="persona-name">Profile Name *</Label>
            <Input id="persona-name" placeholder="e.g. Senior Backend Engineer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-family">Target Role Family *</Label>
            <Input id="role-family" placeholder="e.g. Software Engineering" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
