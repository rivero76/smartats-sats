import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Settings as SettingsIcon, User, Bell, Shield, Database, Key, Loader2, AlertTriangle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useProfile, type ProfileFormData } from "@/hooks/useProfile"
import { useAccountDeletion } from "@/hooks/useAccountDeletion"
import { DeleteAccountModal } from "@/components/DeleteAccountModal"
import { useEffect, useState } from "react"
import { HelpButton } from "@/components/help/HelpButton"
import { HelpModal } from "@/components/help/HelpModal"
import { getHelpContent } from "@/data/helpContent"

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string(),
  location: z.string(),
  professional_summary: z.string(),
  linkedin_url: z.string().refine((val) => !val || z.string().url().safeParse(val).success, "Please enter a valid URL"),
  portfolio_url: z.string().refine((val) => !val || z.string().url().safeParse(val).success, "Please enter a valid URL"),
});

const Settings = () => {
  const { loading, saving, getFormData, saveProfile } = useProfile();
  const { deletionStatus, isLoading: isDeletionLoading, isCancelling, cancelDeletion, refreshStatus } = useAccountDeletion();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const helpContent = getHelpContent('profileSettings');
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      professional_summary: "",
      linkedin_url: "",
      portfolio_url: "",
    },
  });

  // Update form when profile data is loaded
  useEffect(() => {
    if (!loading) {
      const formData = getFormData();
      form.reset(formData);
    }
  }, [loading, getFormData, form]);

  const onSubmit = async (data: ProfileFormData) => {
    await saveProfile(data);
  };

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
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Settings</span>
          </CardTitle>
          <CardDescription>
            Update your personal information and preferences.
          </CardDescription>
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
                        <Input placeholder="Brief professional summary" {...field} />
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

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Preferences <span className="text-sm text-muted-foreground">(Coming Soon)</span></span>
          </CardTitle>
          <CardDescription>
            Choose what notifications you'd like to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 opacity-60">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Analysis Complete</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your ATS analysis is ready
              </p>
            </div>
            <Switch disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">New Features</Label>
              <p className="text-sm text-muted-foreground">
                Stay updated on new Smart ATS features and improvements
              </p>
            </div>
            <Switch disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly summaries of your ATS activities
              </p>
            </div>
            <Switch disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive tips and insights about resume optimization
              </p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Privacy</span>
          </CardTitle>
          <CardDescription>
            Manage your account security and data privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 opacity-60">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" placeholder="Enter current password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" placeholder="Enter new password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirm new password" disabled />
            </div>
            <Button disabled>Update Password <span className="ml-2 text-xs">(Coming Soon)</span></Button>
          </div>
          
          <Separator className="my-6" />
          
          <div className="flex items-center justify-between opacity-60">
            <div className="space-y-0.5">
              <Label className="text-base">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline" disabled>Enable 2FA <span className="ml-2 text-xs">(Coming Soon)</span></Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Data Management</span>
          </CardTitle>
          <CardDescription>
            Export your data or manage your account data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
            <div>
              <h4 className="font-medium">Export Data</h4>
              <p className="text-sm text-muted-foreground">
                Download all your resumes, analyses, and job descriptions
              </p>
            </div>
            <Button variant="outline" disabled>Export <span className="ml-2 text-xs">(Coming Soon)</span></Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Delete Account</h4>
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
                        Permanent deletion: {new Date(deletionStatus.permanentDeletionDate!).toLocaleDateString()}
                      </p>
                      <p className="text-xs">
                        Days remaining: {deletionStatus.daysRemaining}
                      </p>
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

      {/* API Settings (Future) */}
      <Card className="opacity-75">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>API Access (Coming Soon)</span>
          </CardTitle>
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
          refreshStatus();
          // User will be signed out automatically by the edge function
        }}
      />

      {/* Help Modal */}
      {helpContent && (
        <HelpModal 
          open={showHelp}
          onOpenChange={setShowHelp}
          content={helpContent}
        />
      )}
    </div>
  )
}

export default Settings