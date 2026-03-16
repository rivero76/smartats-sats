// UPDATE LOG
// 2026-03-17 12:00:00 | P16 Story 1: PersonaManager component for Settings page

import { useState } from 'react'
import {
  useResumePersonas,
  useCreatePersona,
  useUpdatePersona,
  useDeletePersona,
  type ResumePersona,
  type CreatePersonaData,
  type UpdatePersonaData,
} from '@/hooks/useResumePersonas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Plus, Pencil, Trash2, IdCard } from 'lucide-react'

interface PersonaFormValues {
  persona_name: string
  target_role_family: string
  custom_summary: string
}

const emptyForm: PersonaFormValues = {
  persona_name: '',
  target_role_family: '',
  custom_summary: '',
}

function PersonaFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
  isSaving,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  initialValues: PersonaFormValues
  isSaving: boolean
  onSubmit: (values: PersonaFormValues) => void
}) {
  const [values, setValues] = useState<PersonaFormValues>(initialValues)
  const [errors, setErrors] = useState<Partial<PersonaFormValues>>({})

  // Reset form when dialog opens with new initial values
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setValues(initialValues)
      setErrors({})
    }
    onOpenChange(isOpen)
  }

  const validate = (): boolean => {
    const newErrors: Partial<PersonaFormValues> = {}
    if (!values.persona_name.trim()) newErrors.persona_name = 'Profile name is required.'
    if (!values.target_role_family.trim()) newErrors.target_role_family = 'Role family is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="persona_name">Profile Name *</Label>
            <Input
              id="persona_name"
              placeholder="e.g. Senior Backend Engineer"
              value={values.persona_name}
              onChange={(e) => setValues((v) => ({ ...v, persona_name: e.target.value }))}
              disabled={isSaving}
            />
            {errors.persona_name && (
              <p className="text-sm text-destructive">{errors.persona_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_role_family">Target Role Family *</Label>
            <Input
              id="target_role_family"
              placeholder="e.g. Software Engineering, Product Management"
              value={values.target_role_family}
              onChange={(e) => setValues((v) => ({ ...v, target_role_family: e.target.value }))}
              disabled={isSaving}
            />
            {errors.target_role_family && (
              <p className="text-sm text-destructive">{errors.target_role_family}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom_summary">Custom Summary (Optional)</Label>
            <Textarea
              id="custom_summary"
              placeholder="A brief summary tailored to this role family…"
              className="min-h-[100px]"
              value={values.custom_summary}
              onChange={(e) => setValues((v) => ({ ...v, custom_summary: e.target.value }))}
              disabled={isSaving}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PersonaManager() {
  const { data: personas, isLoading, isError, error } = useResumePersonas()
  const createMutation = useCreatePersona()
  const updateMutation = useUpdatePersona()
  const deleteMutation = useDeletePersona()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPersona, setEditingPersona] = useState<ResumePersona | null>(null)
  const [deletingPersonaId, setDeletingPersonaId] = useState<string | null>(null)

  const handleCreate = (values: PersonaFormValues) => {
    const payload: CreatePersonaData = {
      persona_name: values.persona_name.trim(),
      target_role_family: values.target_role_family.trim(),
      custom_summary: values.custom_summary.trim() || null,
    }
    createMutation.mutate(payload, {
      onSuccess: () => setShowCreateDialog(false),
    })
  }

  const handleUpdate = (values: PersonaFormValues) => {
    if (!editingPersona) return
    const payload: UpdatePersonaData & { id: string } = {
      id: editingPersona.id,
      persona_name: values.persona_name.trim(),
      target_role_family: values.target_role_family.trim(),
      custom_summary: values.custom_summary.trim() || null,
    }
    updateMutation.mutate(payload, {
      onSuccess: () => setEditingPersona(null),
    })
  }

  const handleDeleteConfirm = () => {
    if (!deletingPersonaId) return
    deleteMutation.mutate(deletingPersonaId, {
      onSuccess: () => setDeletingPersonaId(null),
      onError: () => setDeletingPersonaId(null),
    })
  }

  const editInitialValues = editingPersona
    ? {
        persona_name: editingPersona.persona_name,
        target_role_family: editingPersona.target_role_family,
        custom_summary: editingPersona.custom_summary || '',
      }
    : emptyForm

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IdCard className="h-5 w-5" />
              <div>
                <CardTitle>My Resume Profiles</CardTitle>
                <CardDescription className="mt-1">
                  Resume profiles let you tailor your ATS scoring and keyword emphasis per role
                  family. Create a profile for each type of position you apply to.
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load resume profiles.'}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && personas && personas.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No profiles yet. Create one to tailor your ATS scoring per role.
            </p>
          )}

          {!isLoading && !isError && personas && personas.length > 0 && (
            <ul className="space-y-3">
              {personas.map((persona) => (
                <li
                  key={persona.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium leading-none">{persona.persona_name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {persona.target_role_family}
                    </Badge>
                    {persona.custom_summary && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {persona.custom_summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPersona(persona)}
                      disabled={deleteMutation.isPending}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingPersonaId(persona.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <PersonaFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Create Resume Profile"
        description="Set up a new profile to customize your ATS scoring for a specific role family."
        initialValues={emptyForm}
        isSaving={createMutation.isPending}
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <PersonaFormDialog
        open={!!editingPersona}
        onOpenChange={(open) => { if (!open) setEditingPersona(null) }}
        title="Edit Resume Profile"
        description="Update this profile's details."
        initialValues={editInitialValues}
        isSaving={updateMutation.isPending}
        onSubmit={handleUpdate}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingPersonaId}
        onOpenChange={(open) => { if (!open) setDeletingPersonaId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume Profile</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default PersonaManager
