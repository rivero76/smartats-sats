import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const Index = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // If user is authenticated, this should redirect to dashboard
  // but actually the App.tsx routing handles this differently
  return null
}

export default Index
