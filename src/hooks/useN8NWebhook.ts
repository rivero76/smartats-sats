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
  message?: string
}

const DEFAULT_WEBHOOK_URL = 'https://rivero76.app.n8n.cloud/webhook-test/3933699e-651b-487a-bc9d-01ed0eccf660'
const WEBHOOK_URL_KEY = 'n8n_webhook_url'

export const useN8NWebhook = () => {
  const [webhookUrl, setWebhookUrlState] = useState<string>(() => {
    // Clear any old webhook URLs and use the new default
    const storedUrl = localStorage.getItem(WEBHOOK_URL_KEY)
    if (storedUrl && storedUrl !== DEFAULT_WEBHOOK_URL) {
      console.log('Clearing old webhook URL and using new default:', DEFAULT_WEBHOOK_URL)
      localStorage.setItem(WEBHOOK_URL_KEY, DEFAULT_WEBHOOK_URL)
    }
    return DEFAULT_WEBHOOK_URL
  })

  const setWebhookUrl = (url: string) => {
    setWebhookUrlState(url)
    localStorage.setItem(WEBHOOK_URL_KEY, url)
  }

  const resetToDefaultUrl = () => {
    console.log('Resetting to default webhook URL:', DEFAULT_WEBHOOK_URL)
    setWebhookUrlState(DEFAULT_WEBHOOK_URL)
    localStorage.setItem(WEBHOOK_URL_KEY, DEFAULT_WEBHOOK_URL)
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
        console.log('Sending webhook request to:', webhookUrl)
        console.log('Payload:', JSON.stringify(payload, null, 2))

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        
        console.log('Webhook response status:', response.status)
        console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Webhook error response:', errorText)
          throw new Error(`Webhook request failed with status: ${response.status}. Response: ${errorText}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text()
          console.warn('Non-JSON response from webhook:', responseText)
          
          // Try to handle common N8N responses
          if (responseText.includes('success') || response.status === 200) {
            return {
              success: true,
              analysis_id: payload.analysis_id,
              message: 'Webhook executed successfully but returned non-JSON response'
            } as N8NWebhookResponse
          }
          
          throw new Error(`Webhook returned non-JSON response: ${responseText}`)
        }

        const data = await response.json()
        console.log('Webhook response data:', data)
        return data as N8NWebhookResponse
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('Webhook request error:', error)
        
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

  const testConnectivity = useMutation({
    mutationFn: async (testUrl?: string): Promise<{ success: boolean; status?: number; message?: string; error?: string }> => {
      const url = testUrl || webhookUrl
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for connectivity

      try {
        console.log('Testing connectivity to:', url)

        // Try a simple GET request first to check if the endpoint exists
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        
        console.log('Connectivity test response status:', response.status)
        console.log('Connectivity test response headers:', Object.fromEntries(response.headers.entries()))

        // For webhooks, we expect certain status codes
        if (response.status === 200 || response.status === 405 || response.status === 404) {
          return {
            success: true,
            status: response.status,
            message: response.status === 405 
              ? 'Webhook endpoint found (Method Not Allowed for GET is expected)'
              : response.status === 404
              ? 'Webhook endpoint not found - check URL'
              : 'Webhook endpoint is accessible'
          }
        }

        return {
          success: false,
          status: response.status,
          error: `Unexpected status code: ${response.status}`
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('Connectivity test error:', error)
        
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            error: 'Connectivity test timed out after 10 seconds'
          }
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error'
        }
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Connectivity Test Successful',
          description: result.message || 'Webhook endpoint is reachable',
        })
      }
    },
    onError: (error: any) => {
      console.error('Connectivity test error:', error)
      toast({
        title: 'Connectivity Test Failed',
        description: error.message || 'Failed to reach webhook endpoint',
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
        console.log('Testing webhook URL:', url)
        console.log('Test payload:', JSON.stringify(testPayload, null, 2))

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        
        console.log('Test response status:', response.status)
        console.log('Test response headers:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Test error response:', errorText)
          throw new Error(`Test failed with status: ${response.status}. Response: ${errorText}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text()
          console.warn('Test returned non-JSON response:', responseText)
          
          // Try to handle common N8N responses
          if (responseText.includes('success') || response.status === 200) {
            return {
              success: true,
              analysis_id: testPayload.analysis_id,
              message: 'Test successful but returned non-JSON response'
            } as N8NWebhookResponse
          }
          
          throw new Error(`Test returned non-JSON response: ${responseText}`)
        }

        const data = await response.json()
        console.log('Test response data:', data)
        return data as N8NWebhookResponse
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('Test request error:', error)
        
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
    resetToDefaultUrl,
    validateWebhookUrl,
    sendWebhook,
    testConnectivity,
    testWebhook,
    isLoading: sendWebhook.isPending || testWebhook.isPending || testConnectivity.isPending,
  }
}