/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Card stories — default, with header/footer, compact, dark mode.
 */
import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>A short description of the card content.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">This is the main content area of the card.</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>ATS Analysis</CardTitle>
        <CardDescription>Resume vs Job Description match</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Match Score</span>
          <span className="text-2xl font-bold">82%</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">View Details</Button>
        <Button size="sm" variant="outline">
          Enrich
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const WithBadge: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upskilling Roadmaps</CardTitle>
          <Badge variant="outline">Beta</Badge>
        </div>
        <CardDescription>Track your skill progress over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Generate a personalised roadmap from any ATS analysis.
        </p>
      </CardContent>
    </Card>
  ),
}

export const EmptyState: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <p className="font-semibold">No data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by uploading your first resume.
        </p>
        <Button className="mt-4" size="sm">
          Upload Resume
        </Button>
      </CardContent>
    </Card>
  ),
}
