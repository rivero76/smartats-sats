/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S5-1: Table stories — basic, with caption, striped rows.
 */
import type { Meta, StoryObj } from '@storybook/react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Table>

const analyses = [
  {
    id: '1',
    resume: 'Software Engineer Resume',
    job: 'Senior Eng @ Stripe',
    score: 88,
    status: 'completed',
  },
  { id: '2', resume: 'Product Manager Resume', job: 'PM @ Linear', score: 74, status: 'completed' },
  {
    id: '3',
    resume: 'Software Engineer Resume',
    job: 'Staff Eng @ Vercel',
    score: 61,
    status: 'processing',
  },
]

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Recent ATS analyses.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Resume</TableHead>
          <TableHead>Job Description</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {analyses.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.resume}</TableCell>
            <TableCell>{row.job}</TableCell>
            <TableCell className="text-right font-bold">{row.score}%</TableCell>
            <TableCell>
              <Badge variant={row.status === 'completed' ? 'default' : 'secondary'}>
                {row.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resume</TableHead>
          <TableHead>Job Description</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No analyses yet. Run your first ATS analysis to see results here.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const Minimal: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Skills Alignment</TableCell>
          <TableCell>88%</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Experience Relevance</TableCell>
          <TableCell>72%</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Domain Fit</TableCell>
          <TableCell>95%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
