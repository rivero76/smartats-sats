// UPDATE LOG
// 2026-03-17 12:00:00 | P16 Story 1: added PersonaManager (My Resume Profiles) section
// 2026-03-26 | S3-1: fix heading hierarchy (section CardTitle → h2, h4 → h3); add aria-label to Switch components (P19-S3-1)
// 2026-03-30 10:00:00 | P25 S6 — Added SkillProfileManager section before Data Management card.
// 2026-04-02 01:00:00 | P20 S4 — Added Reset Career Data button + ResetCareerDataModal wiring.
// 2026-04-02 04:00:00 | ADR-0007 — Added Email Job Alerts integration card (Postmark inbound).
// 2026-04-05 20:30:00 | P26 S3-2 — Added CareerGoalsCard section (target markets + primary role family).

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  Key,
  Loader2,
  AlertTriangle,
  Mail,
  Copy,
  Check,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfile, type ProfileFormData } from '@/hooks/useProfile'
import { useAccountDeletion } from '@/hooks/useAccountDeletion'
import { DeleteAccountModal } from '@/components/DeleteAccountModal'
import { ResetCareerDataModal } from '@/components/ResetCareerDataModal'
import { PersonaManager } from '@/components/PersonaManager'
import { SkillProfileManager } from '@/components/skill-profile/SkillProfileManager'
import { CareerGoalsCard } from '@/components/CareerGoalsCard'
import { useEffect, useState } from 'react'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string(),
  location: z.string(),
  professional_summary: z.string(),
  linkedin_url: z
    .string()
    .refine((val) => !val || z.string().url().safeParse(val).success, 'Please enter a valid URL'),
  portfolio_url: z
    .string()
    .refine((val) => !val || z.string().url().safeParse(val).success, 'Please enter a valid URL'),
})

const Settings = () => {
  const { loading, saving, getFormData, saveProfile } = useProfile()
  const {
    deletionStatus,
    isLoading: isDeletionLoading,
    isCancelling,
    cancelDeletion,
    refreshStatus,
  } = useAccountDeletion()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [copiedInboundUrl, setCopiedInboundUrl] = useState(false)

  const INBOUND_EMAIL_ADDRESS = 'alerts@inbound.smartats.app'
  const INBOUND_WEBHOOK_URL =
    'https://nkgscksbgmzhizohobhg.functions.supabase.co/inbound-email-ingest'

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('profileSettings')

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      professional_summary: '',
      linkedin_url: '',
      portfolio_url: '',
    },
  })

  // Update form when profile data is loaded
  useEffect(() => {
    if (!loading) {
      const formData = getFormData()
      console.log('Settings: Resetting form with data:', formData)
      form.reset(formData)
    }
  }, [loading, form.reset])

  const onSubmit = async (data: ProfileFormData) => {
    console.log('Settings: Form submitted with data:', data)
    await saveProfile(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences, notifications, and application settings.
          </p>
        </div>
        {helpContent && (
          <HelpButton
            onClick={() => setShowHelp(true)}
            tooltip="Learn how to configure your profile and settings"
          />
        )}
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Settings</span>
          </h2>
          <CardDescription>Update your personal information and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading profile...</span>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professional_summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Summary (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief professional summary"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolio_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourportfolio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Resume Profiles */}
      <section>
        <PersonaManager />
      </section>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>
              Notification Preferences{' '}
              <span className="text-sm text-muted-foreground">(Coming Soon)</span>
            </span>
          </h2>
          <CardDescription>Choose what notifications you'd like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 opacity-60">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Analysis Complete</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your ATS analysis is ready
              </p>
            </div>
            <Switch disabled aria-label="Analysis complete notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">New Features</Label>
              <p className="text-sm text-muted-foreground">
                Stay updated on new Smart ATS features and improvements
              </p>
            </div>
            <Switch disabled aria-label="New features notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly summaries of your ATS activities
              </p>
            </div>
            <Switch disabled aria-label="Weekly summary notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive tips and insights about resume optimization
              </p>
            </div>
            <Switch disabled aria-label="Marketing communications notifications" />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Privacy</span>
          </h2>
          <CardDescription>Manage your account security and data privacy settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 opacity-60">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" placeholder="Enter new password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                disabled
              />
            </div>
            <Button disabled>
              Update Password <span className="ml-2 text-xs">(Coming Soon)</span>
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between opacity-60">
            <div className="space-y-0.5">
              <Label className="text-base">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline" disabled>
              Enable 2FA <span className="ml-2 text-xs">(Coming Soon)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Career Goals */}
      <section>
        <CareerGoalsCard />
      </section>

      {/* Skill Profile */}
      <SkillProfileManager />

      {/* Data & Export */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Data Management</span>
          </h2>
          <CardDescription>Export your data or manage your account data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
            <div>
              <h3 className="font-medium">Export Data</h3>
              <p className="text-sm text-muted-foreground">
                Download all your resumes, analyses, and job descriptions
              </p>
            </div>
            <Button variant="outline" disabled>
              Export <span className="ml-2 text-xs">(Coming Soon)</span>
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Reset Career Data</h3>
              <p className="text-sm text-muted-foreground">
                Delete all resumes, analyses, skills, and roadmaps — keeps your account and settings
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/5"
              onClick={() => setShowResetModal(true)}
            >
              Reset career data
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            {deletionStatus.isScheduledForDeletion ? (
              <div className="text-right space-y-2">
                <Alert className="border-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium text-destructive text-xs">
                        Account scheduled for deletion
                      </p>
                      <p className="text-xs">
                        Permanent deletion:{' '}
                        {new Date(deletionStatus.permanentDeletionDate!).toLocaleDateString()}
                      </p>
                      <p className="text-xs">Days remaining: {deletionStatus.daysRemaining}</p>
                    </div>
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={cancelDeletion}
                  disabled={isCancelling}
                  variant="outline"
                  size="sm"
                >
                  {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel Deletion
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeletionLoading}
              >
                {isDeletionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Job Alerts Integration */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Job Alerts</span>
          </h2>
          <CardDescription>
            Forward job alert emails from LinkedIn, Seek, or Indeed to Smart ATS. Jobs are
            automatically staged and scored against your resumes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Step 1 */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">
              Step 1 — Forward job alert emails to this address
            </h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono select-all">
                {INBOUND_EMAIL_ADDRESS}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(INBOUND_EMAIL_ADDRESS, setCopiedInboundUrl)}
                aria-label="Copy inbound email address"
              >
                {copiedInboundUrl ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              In Gmail: open a LinkedIn job alert email → click the three-dot menu → Forward. Or set
              up an automatic filter: From <strong>jobalerts@linkedin.com</strong> → Forward to this
              address.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Step 2 — One-time Postmark setup (admin)</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Create a free account at <strong>postmark.com</strong> (100 emails/month free)
              </li>
              <li>
                Go to <strong>Servers → Default → Settings → Inbound</strong>
              </li>
              <li>
                Set Webhook URL to:
                <code className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  {INBOUND_WEBHOOK_URL}
                </code>
              </li>
              <li>
                Copy the <strong>X-Postmark-Signature</strong> token shown
              </li>
              <li>
                Save it to the database:
                <code className="block mt-1 rounded bg-muted px-2 py-1 font-mono text-xs whitespace-pre">
                  {`UPDATE sats_runtime_settings
SET value = '<your-token>'
WHERE key = 'postmark_webhook_secret';

UPDATE sats_runtime_settings
SET value = 'your@email.com'
WHERE key = 'inbound_email_allowlist';`}
                </code>
              </li>
            </ol>
          </div>

          {/* How it works */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p>
                <strong>How it works:</strong> When you forward a job alert, Smart ATS parses the
                email, extracts job URLs + titles, and adds them to your proactive job queue. The
                ATS scorer runs automatically and notifies you of strong matches on the{' '}
                <strong>/opportunities</strong> page.
              </p>
              <p className="text-muted-foreground">
                Works with: LinkedIn job alerts, Seek, Indeed, Google Alerts, and recruiter emails
                containing job URLs.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* API Settings (Future) */}
      <Card className="opacity-75">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>API Access (Coming Soon)</span>
          </h2>
          <CardDescription>
            Generate API keys for integrating Smart ATS with your applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            API access will allow you to programmatically analyze resumes and job descriptions.
          </p>
          <Button disabled>Generate API Key</Button>
        </CardContent>
      </Card>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={() => {
          refreshStatus()
          // User will be signed out automatically by the edge function
        }}
      />

      <ResetCareerDataModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => {
          // TanStack Query caches invalidated by the hook — UI will reflect empty state
        }}
      />

      {/* Help Modal */}
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
    </div>
  )
}

export default Settings
