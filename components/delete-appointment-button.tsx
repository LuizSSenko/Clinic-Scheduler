"use client"

import type React from "react"

import { useState } from "react"
import { Trash2 } from "lucide-react"
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

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    setIsDeleting(true)
    console.log(`Deleting appointment with ID: ${id}`)

    try {
      const result = await deleteAppointment(id)
      console.log("Delete result:", result)

      if (result.success) {
        // Call the onDelete callback to update the parent component's state
        if (onDelete) {
          onDelete()
        }

        toast({
          title: "Success",
          description: result.message,
        })

        // Close the dialog
        setIsOpen(false)

        // Refresh the router cache
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to delete appointment",
        })
      }
    } catch (error) {
      console.error("Error in delete handler:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      setIsOpen(open)
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(true)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleButtonClick} className="z-10">
          <Trash2 className="h-4 w-4" />
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
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
