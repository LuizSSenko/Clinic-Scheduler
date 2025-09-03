"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { deleteAppointment } from "@/lib/actions"
import { useRouter } from "next/navigation"

interface DeleteAppointmentButtonProps {
  id: string
  onDelete?: () => void
}

export function DeleteAppointmentButton({ id, onDelete }: DeleteAppointmentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Reset states when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false)
    }
  }, [isOpen])

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (isDeleting) {
      console.log("Delete already in progress, ignoring click")
      return
    }

    setIsDeleting(true)
    console.log(`Starting delete process for appointment ID: ${id}`)

    try {
      const result = await deleteAppointment(id)
      console.log("Delete result:", result)

      if (result.success) {
        // Call the onDelete callback to update the parent component's state
        if (onDelete) {
          console.log("Calling onDelete callback")
          onDelete()
        }

        toast({
          title: "Success",
          description: result.message,
        })

        // Force close the dialog and reset state
        setIsDeleting(false)
        setIsOpen(false)

        // Refresh the router cache after a short delay
        setTimeout(() => {
          router.refresh()
        }, 500)
      } else {
        console.error("Delete failed:", result.message)
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to delete appointment",
        })
        setIsDeleting(false)
      }
    } catch (error) {
      console.error("Error in delete handler:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      })
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    console.log("Dialog open change:", open, "isDeleting:", isDeleting)
    setIsOpen(open)

    // If dialog is being closed and we're not deleting, reset the deleting state
    if (!open && !isDeleting) {
      setIsDeleting(false)
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDeleting) {
      setIsOpen(true)
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setIsDeleting(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleButtonClick} className="z-10" disabled={isDeleting}>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Delete appointment</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the appointment from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
