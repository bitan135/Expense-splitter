"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button, Card, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { Header } from "@/components/layout/header"
import { SettingsModal } from "@/components/settings/settings-modal"
import { Plus, Trash2, Settings } from "lucide-react"

export default function HomePage() {
  const { state, dispatch } = useStore()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")


  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return
    dispatch({ type: "CREATE_GROUP", payload: { name: newGroupName.trim() } })
    setNewGroupName("")
    setIsModalOpen(false)
  }

  const handleDeleteGroup = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm("Delete this group? This action cannot be undone.")) {
      dispatch({ type: "DELETE_GROUP", payload: { id } })
    }
  }


  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Your Groups"
        rightAction={
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        }
      />

      <main className="p-4 max-w-md mx-auto space-y-4">
        {state.loaded && state.groups.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <p>No groups yet.</p>
            <p className="text-sm">Create one to start splitting!</p>
          </div>
        )}

        {state.groups.map(group => (
          <Card
            key={group.id}
            onClick={() => router.push(`/group/${group.id}`)}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div>
              <h3 className="font-semibold text-lg">{group.name}</h3>
              <p className="text-sm text-muted-foreground">
                {group.members.length} members · {group.expenses.length} expenses
              </p>
            </div>
            <button
              onClick={(e) => handleDeleteGroup(e, group.id)}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </Card>
        ))}

        <div className="fixed bottom-6 right-6 z-30">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={24} />
          </Button>
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Group"
      >
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="Group Name (e.g. Goa Trip)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          />
          <Button className="w-full" onClick={handleCreateGroup}>
            Create Group
          </Button>
        </div>
      </Modal>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
