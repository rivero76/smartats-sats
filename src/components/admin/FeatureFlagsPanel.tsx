/**
 * UPDATE LOG
 * 2026-04-07 13:00:00 | Story 5 — Admin panel for managing per-feature, per-tier
 *   feature flags stored in sats_feature_flags. Allows admins to toggle access
 *   for each plan tier without a code deploy.
 */

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { useFeatureFlags, FEATURE_FLAGS_QUERY_KEY } from '@/hooks/useFeatureFlags'
import { PLAN_FEATURES } from '@/hooks/usePlanFeature'
import type { PlanFeatureKey, PlanTier } from '@/hooks/usePlanFeature'

const PLAN_TIERS: PlanTier[] = ['free', 'pro', 'max', 'enterprise']

type FlagState = Record<PlanFeatureKey, Record<PlanTier, boolean>>

function buildInitialState(flagMap: Map<PlanFeatureKey, Set<PlanTier>>): FlagState {
  const state = {} as FlagState
  const keys = Object.keys(PLAN_FEATURES) as PlanFeatureKey[]
  for (const key of keys) {
    state[key] = {} as Record<PlanTier, boolean>
    for (const tier of PLAN_TIERS) {
      const tiers = flagMap.get(key)
      state[key][tier] = tiers ? tiers.has(tier) : false
    }
  }
  return state
}

function buildInitialStateFromFallback(): FlagState {
  const state = {} as FlagState
  const keys = Object.keys(PLAN_FEATURES) as PlanFeatureKey[]
  for (const key of keys) {
    state[key] = {} as Record<PlanTier, boolean>
    for (const tier of PLAN_TIERS) {
      state[key][tier] = PLAN_FEATURES[key].includes(tier)
    }
  }
  return state
}

export function FeatureFlagsPanel() {
  const queryClient = useQueryClient()
  const { flagMap, isLoading, isError } = useFeatureFlags()
  const [localState, setLocalState] = useState<FlagState | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialise local state once flags are loaded
  useEffect(() => {
    if (!isLoading) {
      const initial =
        !isError && flagMap.size > 0 ? buildInitialState(flagMap) : buildInitialStateFromFallback()
      setLocalState(initial)
      setHasChanges(false)
    }
  }, [isLoading, isError, flagMap])

  const handleToggle = (key: PlanFeatureKey, tier: PlanTier, value: boolean) => {
    setLocalState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: { ...prev[key], [tier]: value },
      }
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!localState) return
    setIsSaving(true)

    try {
      const upsertRows = (Object.keys(localState) as PlanFeatureKey[]).flatMap((key) =>
        PLAN_TIERS.map((tier) => ({
          feature_key: key,
          plan_tier: tier,
          is_enabled: localState[key][tier],
          updated_at: new Date().toISOString(),
        }))
      )

      const { error } = await supabase
        .from('sats_feature_flags')
        .upsert(upsertRows, { onConflict: 'feature_key,plan_tier' })

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_QUERY_KEY })
      setHasChanges(false)
      toast.success('Feature flags saved successfully.')
    } catch (err) {
      console.error('FeatureFlagsPanel save error:', err)
      toast.error('Failed to save feature flags. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !localState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags
          </CardTitle>
          <CardDescription>Loading feature flag configuration…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const featureKeys = Object.keys(PLAN_FEATURES) as PlanFeatureKey[]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags
          </CardTitle>
          <CardDescription>
            Toggle feature access per plan tier. Changes take effect immediately after saving.
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm">
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-64">
                  Feature
                </th>
                {PLAN_TIERS.map((tier) => (
                  <th
                    key={tier}
                    className="text-center py-2 px-4 font-medium text-muted-foreground capitalize"
                  >
                    {tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureKeys.map((key) => (
                <tr
                  key={key}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-4 font-mono text-xs text-foreground">{key}</td>
                  {PLAN_TIERS.map((tier) => (
                    <td key={tier} className="py-3 px-4 text-center">
                      <Switch
                        checked={localState[key][tier]}
                        onCheckedChange={(val) => handleToggle(key, tier, val)}
                        aria-label={`${key} for ${tier} tier`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
