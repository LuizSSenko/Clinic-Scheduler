"use client"

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
import { deleteBlockedTime } from "@/lib/actions"
import { useRouter } from "next/navigation"

interface DeleteBlockedTimeButtonProps {
  id: string
  onDelete?: () => void
}

export function DeleteBlockedTimeButton({ id, onDelete }: DeleteBlockedTimeButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const result = await deleteBlockedTime(id)

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
    } catch (error) {
      console.error("Error deleting blocked time:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete blocked time. Please try again.",
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

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(true)
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete blocked time</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the blocked time period from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
