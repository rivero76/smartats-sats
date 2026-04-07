/**
 * UPDATE LOG
 * 2026-04-08 | P29 — Admin panel for reviewing and actioning MVP upgrade requests.
 *   Filter bar: All / Pending / Approved / Denied (pill buttons, inline, not dropdown).
 *   Approve: atomic RPC (updates both request status + profiles.plan_override).
 *   Deny: direct status update, no plan change.
 *   Pending count badge exported for use in AdminDashboard tab trigger.
 */
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, CheckCircle2, XCircle } from 'lucide-react'
import {
  useUpgradeRequests,
  useApproveUpgradeRequest,
  useDenyUpgradeRequest,
  type UpgradeRequestStatus,
} from '@/hooks/useUpgradeRequests'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierBadge(tier: string) {
  const colours: Record<string, string> = {
    pro: 'bg-blue-100 text-blue-800',
    max: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800',
    free: '',
  }
  return colours[tier] ?? ''
}

function statusBadgeVariant(
  status: UpgradeRequestStatus
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'approved') return 'default'
  if (status === 'denied') return 'destructive'
  return 'secondary'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type FilterOption = 'all' | UpgradeRequestStatus

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradeRequestsPanel() {
  const [filter, setFilter] = useState<FilterOption>('pending')
  const { data = [], isLoading, error } = useUpgradeRequests()
  const approveMutation = useApproveUpgradeRequest()
  const denyMutation = useDenyUpgradeRequest()

  const filtered = filter === 'all' ? data : data.filter((r) => r.status === filter)
  const pendingCount = data.filter((r) => r.status === 'pending').length

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Upgrade Requests
          </CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Upgrade Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load upgrade requests. Check your admin permissions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Upgrade Requests
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Review and approve or deny tier upgrade requests from testers. Approving updates the
              user's plan immediately.
            </CardDescription>
          </div>

          {/* ── Filter bar (inline pill buttons per UI/UX Design Principles) ── */}
          <div className="rounded-lg border p-1 flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  filter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
                {f.value === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-[10px] px-1 py-0 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {filter === 'all' ? 'No upgrade requests yet.' : `No ${filter} requests.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                    Requested
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Current</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                    Submitted
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isActioning =
                    (approveMutation.isPending && approveMutation.variables === row.id) ||
                    (denyMutation.isPending && denyMutation.variables === row.id)

                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* User */}
                      <td className="py-3 pr-4">
                        <span className="font-medium">{row.full_name ?? '—'}</span>
                        {row.email && (
                          <span className="block text-xs text-muted-foreground">{row.email}</span>
                        )}
                      </td>

                      {/* Requested tier */}
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={`capitalize ${tierBadge(row.requested_tier)}`}
                        >
                          {row.requested_tier}
                        </Badge>
                      </td>

                      {/* Current tier */}
                      <td className="py-3 pr-4">
                        <span className="text-xs text-muted-foreground capitalize">
                          {row.current_tier}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-3 pr-4">
                        <Badge
                          variant={statusBadgeVariant(row.status)}
                          className="capitalize text-xs"
                        >
                          {row.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3">
                        {row.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                              disabled={isActioning}
                              onClick={() => approveMutation.mutate(row.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {approveMutation.isPending && approveMutation.variables === row.id
                                ? 'Approving…'
                                : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-red-700 border-red-300 hover:bg-red-50"
                              disabled={isActioning}
                              onClick={() => denyMutation.mutate(row.id)}
                            >
                              <XCircle className="h-3 w-3" />
                              {denyMutation.isPending && denyMutation.variables === row.id
                                ? 'Denying…'
                                : 'Deny'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
