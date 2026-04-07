/**
 * UPDATE LOG
 * 2026-04-08 | P29 — New component: modal for MVP upgrade intent capture.
 *   Replaces the "coming soon / mailto" dialog in PlanBillingCard.
 *   Calls the request-plan-upgrade edge function via supabase.functions.invoke().
 *   Admin email is server-side only — never exposed to this component.
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { PlanTier } from '@/hooks/usePlanFeature'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpgradeModalTier {
  key: PlanTier
  label: string
  features: string[]
}

interface UpgradeRequestModalProps {
  tier: UpgradeModalTier | null
  onClose: () => void
}

type ModalState = 'idle' | 'submitting' | 'success' | 'error'

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradeRequestModal({ tier, onClose }: UpgradeRequestModalProps) {
  const [state, setState] = useState<ModalState>('idle')

  const handleSubmit = async () => {
    if (!tier) return
    setState('submitting')
    try {
      const { error } = await supabase.functions.invoke('request-plan-upgrade', {
        body: { requested_tier: tier.key },
      })
      if (error) throw error
      setState('success')
    } catch (err) {
      console.error('Upgrade request error:', err)
      setState('error')
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleClose = () => {
    setState('idle')
    onClose()
  }

  return (
    <Dialog open={!!tier} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-sm">
        {state === 'success' ? (
          // ── Success state ────────────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Request submitted
              </DialogTitle>
              <DialogDescription>
                We'll review your request and activate your{' '}
                <span className="font-medium">{tier?.label}</span> plan shortly.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground pt-1">
              Your request has been submitted. We'll review it and activate your plan shortly.
            </p>
            <Button className="w-full mt-4" onClick={handleClose}>
              Got it
            </Button>
          </>
        ) : (
          // ── Request form ─────────────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Upgrade to {tier?.label}
              </DialogTitle>
              <DialogDescription>
                Billing is launching very soon. Submit a request and we'll activate your{' '}
                <span className="font-medium">{tier?.label}</span> plan manually — usually within 24
                hours.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              {/* Feature preview */}
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p className="font-medium text-sm">What you get on {tier?.label}:</p>
                <ul className="space-y-1 mt-1">
                  {tier?.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {state === 'error' && (
                <p className="text-xs text-destructive text-center">
                  Something went wrong. Please try again.
                </p>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSubmit} disabled={state === 'submitting'}>
                  {state === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Request access'
                  )}
                </Button>
                <Button variant="outline" onClick={handleClose} disabled={state === 'submitting'}>
                  Later
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
