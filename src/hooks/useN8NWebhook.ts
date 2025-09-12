import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'

export interface N8NWebhookPayload {
  analysis_id: string
  user_id: string
  resume_data: {
    id: string
    name: string
    content?: string
    file_url?: string
  }
  job_description_data: {
    id: string
    name: string
    content?: string
    company?: {
      id: string
      name: string
    }
    location?: {
      id: string
      name: string
    }
  }
  timestamp: string
  request_id: string
}

export interface N8NWebhookResponse {
  success: boolean
  analysis_id?: string
  ats_score?: number
  matched_skills?: string[]
  missing_skills?: string[]
  suggestions?: string
  error?: string
}

const DEFAULT_WEBHOOK_URL = 'https://rivero76.app.n8n.cloud/webhook-test/3933699e-651b-487a-bc9d-01ed0eccf660'
const WEBHOOK_URL_KEY = 'n8n_webhook_url'

export const useN8NWebhook = () => {
  const [webhookUrl, setWebhookUrlState] = useState<string>(() => {
    return localStorage.getItem(WEBHOOK_URL_KEY) || DEFAULT_WEBHOOK_URL
  })

  const setWebhookUrl = (url: string) => {
    setWebhookUrlState(url)
    localStorage.setItem(WEBHOOK_URL_KEY, url)
  }

  const validateWebhookUrl = (url: string): boolean => {
    try {
      new URL(url)
      return url.includes('webhook') || url.includes('n8n')
    } catch {
      return false
    }
  }

  const sendWebhook = useMutation({
    mutationFn: async (payload: N8NWebhookPayload): Promise<N8NWebhookResponse> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Webhook request failed with status: ${response.status}`)
        }

        const data = await response.json()
        return data as N8NWebhookResponse
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Webhook request timed out after 30 seconds')
        }
        throw error
      }
    },
    onError: (error: any) => {
      console.error('Webhook error:', error)
      toast({
        title: 'Webhook Error',
        description: error.message || 'Failed to send data to N8N webhook',
        variant: 'destructive',
      })
    },
  })

  const testWebhook = useMutation({
    mutationFn: async (testUrl?: string): Promise<N8NWebhookResponse> => {
      const url = testUrl || webhookUrl
      
      const testPayload: N8NWebhookPayload = {
        analysis_id: 'test-analysis-id',
        user_id: 'test-user-id',
        resume_data: {
          id: 'test-resume-id',
          name: 'Test Resume.pdf',
          content: 'This is a test resume content with skills like JavaScript, React, and Node.js.'
        },
        job_description_data: {
          id: 'test-job-id',
          name: 'Senior Developer Position',
          content: 'We are looking for a senior developer with experience in React, Node.js, and TypeScript.',
          company: {
            id: 'test-company-id',
            name: 'Test Company Inc.'
          },
          location: {
            id: 'test-location-id',
            name: 'New York, NY'
          }
        },
        timestamp: new Date().toISOString(),
        request_id: `test-${Date.now()}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Test failed with status: ${response.status}`)
        }

        const data = await response.json()
        return data as N8NWebhookResponse
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Test request timed out after 30 seconds')
        }
        throw error
      }
    },
    onSuccess: () => {
      toast({
        title: 'Webhook Test Successful',
        description: 'N8N webhook is working correctly',
      })
    },
    onError: (error: any) => {
      console.error('Webhook test error:', error)
      toast({
        title: 'Webhook Test Failed',
        description: error.message || 'Failed to connect to N8N webhook',
        variant: 'destructive',
      })
    },
  })

  return {
    webhookUrl,
    setWebhookUrl,
    validateWebhookUrl,
    sendWebhook,
    testWebhook,
    isLoading: sendWebhook.isPending || testWebhook.isPending,
  }
}