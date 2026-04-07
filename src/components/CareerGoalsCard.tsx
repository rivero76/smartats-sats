/**
 * UPDATE LOG
 * 2026-04-05 20:30:00 | P26 S3-2 — Career Goals settings card. Allows users to set
 *   their target markets (NZ/AU/UK/BR/US) and primary target role family. These
 *   preferences drive the Gap Analysis engine defaults. Shown in Settings alongside
 *   PersonaManager and SkillProfileManager.
 */
import { useState, useEffect } from 'react'
import { Target, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCareerGoals, useSaveCareerGoals } from '@/hooks/useCareerGoals'
import { useRoleFamilies } from '@/hooks/useRoleFamilies'

// ─── Market options ───────────────────────────────────────────────────────────

const MARKETS: Array<{ code: string; label: string }> = [
  { code: 'nz', label: 'New Zealand' },
  { code: 'au', label: 'Australia' },
  { code: 'uk', label: 'United Kingdom' },
  { code: 'br', label: 'Brazil' },
  { code: 'us', label: 'United States' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function CareerGoalsCard() {
  const { data: goals, isLoading: goalsLoading } = useCareerGoals()
  const { data: roleFamilies = [], isLoading: familiesLoading } = useRoleFamilies()
  const saveGoals = useSaveCareerGoals()

  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [selectedRoleFamily, setSelectedRoleFamily] = useState<string>('')

  // Sync local state when remote data loads
  useEffect(() => {
    if (goals) {
      setSelectedMarkets(goals.target_market_codes ?? [])
      setSelectedRoleFamily(goals.primary_target_role_family_id ?? '')
    }
  }, [goals])

  const toggleMarket = (code: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    )
  }

  const handleSave = () => {
    saveGoals.mutate({
      target_market_codes: selectedMarkets,
      primary_target_role_family_id: selectedRoleFamily || null,
    })
  }

  const isLoading = goalsLoading || familiesLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5" />
          Career Goals
        </CardTitle>
        <CardDescription>
          Set your target markets and primary target role. These preferences drive your Gap Analysis
          and surface the most relevant market signals for your career path.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {!isLoading && (
          <>
            {/* Target markets — multi-toggle */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Target markets</p>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map(({ code, label }) => {
                  const active = selectedMarkets.includes(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleMarket(code)}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                      aria-pressed={active}
                      aria-label={`Toggle ${label}`}
                    >
                      <Badge
                        variant={active ? 'default' : 'outline'}
                        className="cursor-pointer select-none transition-colors"
                      >
                        {label}
                      </Badge>
                    </button>
                  )
                })}
              </div>
              {selectedMarkets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Select at least one market to enable Gap Analysis.
                </p>
              )}
            </div>

            {/* Primary target role — searchable select */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Primary target role</p>
              <Select
                value={selectedRoleFamily || 'none'}
                onValueChange={(val) => setSelectedRoleFamily(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select a role family…" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  <SelectItem value="none">— Not set —</SelectItem>
                  {roleFamilies.map((rf) => (
                    <SelectItem key={rf.id} value={rf.id}>
                      {rf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This role drives which market signals are compared against your skill profile.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                You can update these preferences any time. Changes take effect on the next Gap
                Analysis refresh.
              </p>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveGoals.isPending}
                className="shrink-0"
              >
                {saveGoals.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
