"use client"

import type React from "react"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
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
}

export function DeleteAppointmentButton({ id }: DeleteAppointmentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation() // Prevent event bubbling
    setIsDeleting(true)

    try {
      const result = await deleteAppointment(id)

      toast({
        title: "Success",
        description: result.message,
      })

      // Close the dialog
      setIsOpen(false)

      // Refresh the page data
      router.refresh()
    } catch (error) {
      console.error("Error deleting appointment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
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
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
