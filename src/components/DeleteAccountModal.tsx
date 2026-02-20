import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const DeleteAccountModal = ({ isOpen, onClose, onSuccess }: DeleteAccountModalProps) => {
  const [step, setStep] = useState(1)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [reason, setReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { signOut } = useAuth()

  const handleClose = () => {
    setStep(1)
    setPassword('')
    setConfirmText('')
    setReason('')
    onClose()
  }

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast({
        title: 'Confirmation Required',
        description: "Please type 'DELETE' to confirm account deletion.",
        variant: 'destructive',
      })
      return
    }

    if (!password) {
      toast({
        title: 'Password Required',
        description: 'Please enter your current password to confirm deletion.',
        variant: 'destructive',
      })
      return
    }

    setIsDeleting(true)

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {
          password,
          reason: reason || undefined,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account')
      }

      toast({
        title: 'Account Scheduled for Deletion',
        description: `Your account will be permanently deleted on ${new Date(data.permanent_deletion_date).toLocaleDateString()}. You have 30 days to cancel this request.`,
      })

      // Automatically sign out the user since their session was revoked
      console.log('Account deletion successful, signing out user...')
      await signOut()

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Delete account error:', error)
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete account. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'This action will permanently delete your account and all associated data.'
              : "Please confirm your decision by entering your password and typing 'DELETE'."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. All your data including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Resumes and job descriptions</li>
                  <li>ATS analyses and results</li>
                  <li>Work experiences and skills</li>
                  <li>Account settings and preferences</li>
                </ul>
                will be permanently deleted after a 30-day grace period.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for deletion (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Help us improve by sharing why you're leaving..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your account will be scheduled for deletion with a 30-day grace period. You can
                cancel this request anytime during those 30 days.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="password">Enter your current password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Type "DELETE" to confirm</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>

          {step === 1 && (
            <Button variant="destructive" onClick={handleNextStep}>
              Continue
            </Button>
          )}

          {step === 2 && (
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmText !== 'DELETE'}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
