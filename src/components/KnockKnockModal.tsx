/**
 * UPDATE LOG
 * 2026-04-08 00:00:00 | Initial creation — Knock Knock outreach message modal.
 *   Generates a Bryan Creely-style LinkedIn outreach message for a job opportunity:
 *   genuine interest → specific observation → low-ask close.
 */
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Copy, Check } from 'lucide-react'
import { useGenerateOutreachMessage } from '@/hooks/useOutreachMessage'

interface KnockKnockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobTitle: string
  companyName: string
  matchedSkills: string[]
}

const KnockKnockModal = ({
  open,
  onOpenChange,
  jobTitle,
  companyName,
  matchedSkills,
}: KnockKnockModalProps) => {
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const { mutate: generateMessage, isPending } = useGenerateOutreachMessage()

  // Generate on open
  useEffect(() => {
    if (!open) return
    setMessage('')
    setCopied(false)
    generateMessage(
      { jobTitle, companyName, matchedSkills },
      { onSuccess: (msg) => setMessage(msg) }
    )
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async () => {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Knock Knock Outreach</DialogTitle>
          <DialogDescription>
            Send this to a recruiter or hiring manager at{' '}
            <span className="font-medium text-foreground">{companyName}</span> on LinkedIn. Lead
            with genuine interest — not a job ask.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Bryan Creely's approach: genuine interest → specific connection → low-ask close. Edit
            freely before sending.
          </p>

          {isPending ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Drafting your message…</p>
            </div>
          ) : (
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="resize-none text-sm leading-relaxed"
              placeholder="Your outreach message will appear here…"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleCopy} disabled={!message || isPending}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KnockKnockModal
