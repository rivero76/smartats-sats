/**
 * UPDATE LOG
 * 2026-04-07 14:00:00 | Story 6 — Admin panel for setting per-user plan_override on
 *   the profiles table. Allows admins to elevate individual users to any tier without
 *   billing changes — useful for pilots, support escalations, and testing.
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserCog, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { PlanTier } from '@/hooks/usePlanFeature'

const ADMIN_USER_PLAN_OVERRIDES_QUERY_KEY = ['admin-user-plan-overrides'] as const

interface ProfileRow {
  user_id: string
  email: string | null
  full_name: string | null
  plan_override: string | null
}

type OverrideOption = PlanTier | 'none'

const TIER_OPTIONS: { value: OverrideOption; label: string }[] = [
  { value: 'none', label: 'None (billing default)' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'max', label: 'Max' },
  { value: 'enterprise', label: 'Enterprise' },
]

function tierBadgeVariant(tier: string | null): 'default' | 'secondary' | 'outline' {
  if (!tier) return 'outline'
  if (tier === 'enterprise') return 'default'
  if (tier === 'max' || tier === 'pro') return 'secondary'
  return 'outline'
}

export function PlanOverridePanel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, OverrideOption>>({})
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ADMIN_USER_PLAN_OVERRIDES_QUERY_KEY,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, plan_override')
        .is('deleted_at', null)
        .order('full_name')

      if (error) throw error
      return (data ?? []) as ProfileRow[]
    },
  })

  const filtered = data.filter((row) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (row.full_name ?? '').toLowerCase().includes(q) ||
      row.user_id.toLowerCase().includes(q) ||
      (row.email ?? '').toLowerCase().includes(q)
    )
  })

  const handleSelectChange = (userId: string, value: OverrideOption) => {
    setPendingChanges((prev) => ({ ...prev, [userId]: value }))
  }

  const handleSave = async (userId: string) => {
    const value = pendingChanges[userId]
    if (value === undefined) return

    setSavingRows((prev) => new Set(prev).add(userId))
    try {
      const newOverride = value === 'none' ? null : value
      const { error } = await supabase
        .from('profiles')
        .update({ plan_override: newOverride })
        .eq('user_id', userId)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ADMIN_USER_PLAN_OVERRIDES_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['profile-plan-override', userId] })

      setPendingChanges((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      toast.success('Plan override updated.')
    } catch (err) {
      console.error('PlanOverridePanel save error:', err)
      toast.error('Failed to update plan override. Please try again.')
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const getEffectiveTier = (row: ProfileRow): OverrideOption => {
    if (row.user_id in pendingChanges) return pendingChanges[row.user_id]
    return (row.plan_override as PlanTier | null) ?? 'none'
  }

  const hasPendingChange = (row: ProfileRow): boolean => row.user_id in pendingChanges

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Plan Overrides
          </CardTitle>
          <CardDescription>Loading user profiles…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
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
            <UserCog className="h-5 w-5" />
            Plan Overrides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load profiles. Check your admin permissions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Plan Overrides
        </CardTitle>
        <CardDescription>
          Set a per-user plan override to elevate access without a billing change. Leave blank to
          use the user's billing tier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">User ID</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                    Current Override
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                    Set Override
                  </th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.user_id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-medium">{row.full_name ?? '—'}</span>
                      {row.email && (
                        <span className="block text-xs text-muted-foreground">{row.email}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {row.user_id.slice(0, 8)}…
                    </td>
                    <td className="py-3 pr-4">
                      {row.plan_override ? (
                        <Badge variant={tierBadgeVariant(row.plan_override)} className="capitalize">
                          {row.plan_override}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 w-48">
                      <Select
                        value={getEffectiveTier(row)}
                        onValueChange={(val) =>
                          handleSelectChange(row.user_id, val as OverrideOption)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasPendingChange(row) || savingRows.has(row.user_id)}
                        onClick={() => handleSave(row.user_id)}
                        className="h-8 text-xs"
                      >
                        {savingRows.has(row.user_id) ? 'Saving…' : 'Save'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
