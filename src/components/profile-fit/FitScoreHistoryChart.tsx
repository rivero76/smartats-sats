/**
 * UPDATE LOG
 * 2026-04-07 00:00:00 | P28 S6 — FitScoreHistoryChart component. Renders a
 *   line chart of Profile Fit scores over time for a selected role/market pair.
 *   Uses Recharts (already a transitive dep). Only shown when 2+ data points exist.
 *   Max+ tier only.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ProfileFitReport } from '@/hooks/useProfileFit'

interface FitScoreHistoryChartProps {
  reports: ProfileFitReport[]
  roleFamilyId: string
  marketCode: string
}

export function FitScoreHistoryChart({
  reports,
  roleFamilyId,
  marketCode,
}: FitScoreHistoryChartProps) {
  const filtered = reports
    .filter((r) => r.target_role_family_id === roleFamilyId && r.target_market_code === marketCode)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (filtered.length < 2) return null

  const chartData = filtered.map((r) => ({
    date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: r.fit_score,
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, 'Fit score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
