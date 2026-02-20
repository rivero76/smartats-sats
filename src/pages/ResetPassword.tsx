import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

const ResetPassword = () => {
  const { resetPassword } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // Check if this is a password reset confirmation (has token in URL)
  const isPasswordResetConfirmation = searchParams.get('type') === 'recovery'

  useEffect(() => {
    // Handle the password reset confirmation automatically
    if (isPasswordResetConfirmation) {
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        toast({
          title: 'Reset Link Invalid',
          description:
            errorDescription ||
            'This password reset link is invalid or has expired. Please request a new one.',
          variant: 'destructive',
        })
        // Clear the URL parameters and stay on reset password page
        navigate('/reset-password', { replace: true })
      }
    }
  }, [isPasswordResetConfirmation, searchParams, navigate, toast])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setEmailSent(true)
      toast({
        title: 'Email sent!',
        description: 'Check your email for password reset instructions',
      })
    }

    setIsLoading(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please make sure both passwords are identical',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      })
      return
    }

    setIsResettingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setResetSuccess(true)
      toast({
        title: 'Password updated!',
        description:
          'Your password has been successfully updated. You can now sign in with your new password.',
      })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/auth')
      }, 2000)
    }

    setIsResettingPassword(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {resetSuccess
              ? 'Password Updated!'
              : isPasswordResetConfirmation
                ? 'Set New Password'
                : 'Reset Password'}
          </CardTitle>
          <CardDescription>
            {resetSuccess
              ? 'Your password has been successfully updated'
              : isPasswordResetConfirmation
                ? 'Enter your new password below'
                : emailSent
                  ? "We've sent you a password reset link"
                  : 'Enter your email to reset your password'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {resetSuccess ? (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground">
                Your password has been successfully updated! Redirecting to sign in...
              </p>
            </div>
          ) : isPasswordResetConfirmation ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isResettingPassword}>
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          ) : emailSent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                If an account with that email exists, you'll receive a password reset link shortly.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
