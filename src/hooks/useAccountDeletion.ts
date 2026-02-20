import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DeletionStatus {
  isScheduledForDeletion: boolean
  deletionDate: string | null
  permanentDeletionDate: string | null
  daysRemaining: number | null
}

export const useAccountDeletion = () => {
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus>({
    isScheduledForDeletion: false,
    deletionDate: null,
    permanentDeletionDate: null,
    daysRemaining: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchDeletionStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('deleted_at, deletion_requested_at, deletion_scheduled_for')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching deletion status:', error)
        return
      }

      if (data?.deleted_at) {
        const permanentDeletionDate = new Date(data.deletion_scheduled_for)
        const now = new Date()
        const daysRemaining = Math.max(
          0,
          Math.ceil((permanentDeletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        )

        setDeletionStatus({
          isScheduledForDeletion: true,
          deletionDate: data.deleted_at,
          permanentDeletionDate: data.deletion_scheduled_for,
          daysRemaining,
        })
      } else {
        setDeletionStatus({
          isScheduledForDeletion: false,
          deletionDate: null,
          permanentDeletionDate: null,
          daysRemaining: null,
        })
      }
    } catch (error) {
      console.error('Error fetching deletion status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelDeletion = async () => {
    if (!user || !deletionStatus.isScheduledForDeletion) return

    setIsCancelling(true)

    try {
      const { data, error } = await supabase.functions.invoke('cancel-account-deletion')

      if (error) {
        throw new Error(error.message)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel account deletion')
      }

      toast({
        title: 'Deletion Cancelled',
        description: 'Your account deletion has been cancelled successfully.',
      })

      // Refresh deletion status
      await fetchDeletionStatus()
    } catch (error: any) {
      console.error('Cancel deletion error:', error)
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel account deletion. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCancelling(false)
    }
  }

  useEffect(() => {
    fetchDeletionStatus()
  }, [user])

  return {
    deletionStatus,
    isLoading,
    isCancelling,
    cancelDeletion,
    refreshStatus: fetchDeletionStatus,
  }
}
