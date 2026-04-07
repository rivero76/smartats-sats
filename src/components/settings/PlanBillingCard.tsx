/**
 * UPDATE LOG
 * 2026-04-07 20:30:00 | Initial implementation — "Your Plan" section for Settings page.
 *   Shows current plan tier, tier comparison cards, and upgrade CTAs.
 *   Billing not yet live (P22); upgrade buttons show a "coming soon" dialog with
 *   a contact-us path. C-Level tier uses Contact Sales mailto CTA.
 */
import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CheckCircle2, CreditCard, Sparkles, Zap, Building2 } from 'lucide-react'
import { usePlanFeature, type PlanTier } from '@/hooks/usePlanFeature'

// ─── Tier definitions ─────────────────────────────────────────────────────────

interface TierDef {
  key: PlanTier
  label: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  cta: 'current' | 'upgrade' | 'contact'
  icon: React.ElementType
}

const TIERS: TierDef[] = [
  {
    key: 'free',
    label: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Try it risk-free',
    icon: Zap,
    cta: 'upgrade',
    features: [
      'Up to 3 ATS analyses / month',
      'Resume upload & management',
      'Job description management',
      'Basic ATS compatibility score',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For active job seekers',
    icon: Sparkles,
    popular: true,
    cta: 'upgrade',
    features: [
      'Unlimited ATS analyses',
      'Score sub-dimension breakdown',
      'LinkedIn profile import',
      'Experience enrichment & suggestions',
      'Upskilling roadmaps',
      'Gap Analysis engine',
      'Profile Fit Analyzer',
      'Job discovery alerts',
    ],
  },
  {
    key: 'max',
    label: 'Max',
    price: '$39',
    period: '/mo',
    description: 'Serious career movers',
    icon: Zap,
    cta: 'upgrade',
    features: [
      'Everything in Pro',
      'CV Optimisation Score',
      'Profile vs resume conflict detection',
      'AI prompt & output inspection',
      'Bring your own API key (BYOK)',
      'Custom model selection',
    ],
  },
  {
    key: 'enterprise',
    label: 'C-Level',
    price: '$99',
    period: '/mo',
    description: 'Teams & enterprise',
    icon: Building2,
    cta: 'contact',
    features: [
      'Everything in Max',
      'Multi-seat RBAC',
      'Audit logs',
      'Data residency',
      'SSO (coming soon)',
    ],
  },
]

const TIER_ORDER: PlanTier[] = ['free', 'pro', 'max', 'enterprise']

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanBillingCard() {
  const { plan, isLoading } = usePlanFeature()
  const [upgradingTo, setUpgradingTo] = useState<TierDef | null>(null)

  const currentTierIndex = TIER_ORDER.indexOf(plan)

  const getTierCta = (tier: TierDef): 'current' | 'upgrade' | 'contact' | 'downgrade' => {
    if (tier.key === plan) return 'current'
    if (tier.cta === 'contact') return 'contact'
    if (TIER_ORDER.indexOf(tier.key) < currentTierIndex) return 'downgrade'
    return 'upgrade'
  }

  if (isLoading) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Your Plan
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                You are on the <span className="font-semibold capitalize">{plan}</span> plan.
                {plan === 'free' && ' Upgrade to unlock more features.'}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={
                plan === 'pro'
                  ? 'bg-blue-100 text-blue-800'
                  : plan === 'max'
                    ? 'bg-purple-100 text-purple-800'
                    : plan === 'enterprise'
                      ? 'bg-amber-100 text-amber-800'
                      : ''
              }
            >
              {plan === 'enterprise' ? 'C-Level' : plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => {
              const ctaState = getTierCta(tier)
              const TierIcon = tier.icon
              const isCurrent = ctaState === 'current'

              return (
                <div
                  key={tier.key}
                  className={`relative rounded-xl border p-5 flex flex-col gap-4 transition-shadow ${
                    isCurrent
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : tier.popular
                        ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-border hover:shadow-sm'
                  }`}
                >
                  {/* Popular badge */}
                  {tier.popular && !isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                  {/* Current plan badge */}
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-0.5 rounded-full">
                      Current plan
                    </span>
                  )}

                  {/* Tier header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TierIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{tier.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{tier.price}</span>
                      <span className="text-xs text-muted-foreground">{tier.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-1.5 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-auto pt-1">
                    {ctaState === 'current' ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current plan
                      </Button>
                    ) : ctaState === 'contact' ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          window.open('mailto:hello@smartats.app?subject=C-Level%20Plan%20Enquiry')
                        }
                      >
                        Contact sales
                      </Button>
                    ) : ctaState === 'downgrade' ? (
                      <Button
                        variant="ghost"
                        className="w-full text-muted-foreground text-xs"
                        disabled
                      >
                        Lower tier
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${tier.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                        variant={tier.popular ? 'default' : 'outline'}
                        onClick={() => setUpgradingTo(tier)}
                      >
                        Upgrade to {tier.label}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Billing infrastructure launching soon · All plans include a 14-day free trial
          </p>
        </CardContent>
      </Card>

      {/* Upgrade coming-soon dialog */}
      <Dialog open={!!upgradingTo} onOpenChange={(open) => !open && setUpgradingTo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Upgrade to {upgradingTo?.label}
            </DialogTitle>
            <DialogDescription>
              Billing is launching very soon. In the meantime, reach out to get early access at the{' '}
              <span className="font-medium">{upgradingTo?.label}</span> tier — including all its
              features today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">What you get on {upgradingTo?.label}:</p>
              <ul className="space-y-1">
                {upgradingTo?.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() =>
                  window.open(
                    `mailto:hello@smartats.app?subject=Early%20Access%20%E2%80%94%20${upgradingTo?.label}%20Plan&body=Hi%2C%20I%27d%20like%20early%20access%20to%20the%20${upgradingTo?.label}%20plan.`
                  )
                }
              >
                Request early access
              </Button>
              <Button variant="outline" onClick={() => setUpgradingTo(null)}>
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
