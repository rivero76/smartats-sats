/**
 * UPDATE LOG
 * 2026-04-02 01:00:00 | P20 S4 — ResetCareerDataModal. Typed "RESET" confirmation
 *   modal for career data hard-delete. No password required — less destructive than
 *   account deletion since auth/profile/settings are preserved.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useCareerDataReset } from '@/hooks/useCareerDataReset'

const CONFIRMATION_WORD = 'RESET'

interface ResetCareerDataModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ResetCareerDataModal({ isOpen, onClose, onSuccess }: ResetCareerDataModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const { toast } = useToast()
  const reset = useCareerDataReset()

  const handleClose = () => {
    setConfirmText('')
    onClose()
  }

  const handleReset = async () => {
    if (confirmText !== CONFIRMATION_WORD) {
      toast({
        title: 'Confirmation required',
        description: `Please type '${CONFIRMATION_WORD}' exactly to proceed.`,
        variant: 'destructive',
      })
      return
    }

    reset.mutate(undefined, {
      onSuccess: (result) => {
        const total = Object.values(result.rows_deleted).reduce((a, b) => a + b, 0)
        toast({
          title: 'Career data reset',
          description: `${total} records deleted. Your account and settings are intact.`,
        })
        handleClose()
        onSuccess()
      },
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset All Career Data
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all resumes, job descriptions, analyses, enrichments, skill
            profiles, and roadmaps. Your account, login, and settings will be preserved. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              <strong>What will be deleted:</strong> resumes, job descriptions, ATS analyses,
              enriched experiences, skill profiles, upskilling roadmaps, resume personas, and
              notifications.
              <br />
              <strong>What will be kept:</strong> your account, email, password, and app settings.
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-reset">
              Type <strong>{CONFIRMATION_WORD}</strong> to confirm
            </Label>
            <Input
              id="confirm-reset"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRMATION_WORD}
              disabled={reset.isPending}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={reset.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={reset.isPending || confirmText !== CONFIRMATION_WORD}
          >
            {reset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {reset.isPending ? 'Resetting…' : 'Reset career data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
