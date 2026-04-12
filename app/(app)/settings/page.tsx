"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Channel {
  id: string
  firm_id: string
  channel_type: string
  display_name: string
  is_active: boolean
  default_priority: string
  last_sync_at: string | null
  created_at: string
}

const CHANNEL_TYPE_META: Record<string, { label: string; icon: string; description: string }> = {
  email:       { label: "Email Forwarding",   icon: "mail",    description: "Forward emails with attachments to your firm's ingestion address" },
  gdrive:      { label: "Google Drive",       icon: "folder",  description: "Watch a Drive folder for new documents" },
  dropbox:     { label: "Dropbox",            icon: "box",     description: "Watch a Dropbox folder for new documents" },
  cms_webhook: { label: "CMS Webhook",        icon: "webhook", description: "Receive documents via HTTPS POST from your CMS" },
}

const TYPE_COLORS: Record<string, string> = {
  email:       "bg-blue-500/15 text-blue-400",
  gdrive:      "bg-green-500/15 text-green-400",
  dropbox:     "bg-indigo-500/15 text-indigo-400",
  cms_webhook: "bg-orange-500/15 text-orange-400",
}

export default function SettingsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

  const loadChannels = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/channels")
    if (res.ok) {
      const data = await res.json()
      setChannels(data.channels ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadChannels() }, [loadChannels])

  async function removeChannel(id: string) {
    await fetch(`/api/channels/${id}`, { method: "DELETE" })
    loadChannels()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Channel Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage ingestion channels — email, Google Drive, Dropbox, CMS webhooks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/intake">
              <Button variant="ghost" size="sm">Intake Queue</Button>
            </Link>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              Add Channel
            </Button>
          </div>
        </div>
      </div>

      {/* Email forwarding info */}
      <div className="px-6 py-3 border-b border-border/30 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Email forwarding:</span>{" "}
          Forward documents to{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
            firm00000000-0000-4000-a000-000000000001@ingest.yourapp.com
          </code>{" "}
          or use{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
            +case-slug
          </code>{" "}
          for case-specific routing.
        </p>
      </div>

      {/* API key display */}
      {newApiKey && (
        <div className="px-6 py-3 border-b border-border/30 bg-emerald-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-400">API Key Created</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copy this key now — it won't be shown again.
              </p>
              <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs font-mono select-all">
                {newApiKey}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewApiKey(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading...</div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">No channels connected</p>
            <p className="text-xs mt-1">Add a channel to start receiving documents automatically</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {channels.map(ch => (
              <div key={ch.id} className="px-6 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", TYPE_COLORS[ch.channel_type])}>
                      {CHANNEL_TYPE_META[ch.channel_type]?.label ?? ch.channel_type}
                    </Badge>
                    <span className="text-sm font-medium truncate">{ch.display_name}</span>
                    {!ch.is_active && (
                      <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-500">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ch.last_sync_at && (
                      <span className="text-[11px] text-muted-foreground">
                        Last sync: {new Date(ch.last_sync_at).toLocaleString()}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                      onClick={() => removeChannel(ch.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add channel dialog */}
      <AddChannelDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(apiKey) => {
          if (apiKey) setNewApiKey(apiKey)
          loadChannels()
          setAddOpen(false)
        }}
      />
    </div>
  )
}


function AddChannelDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (apiKey?: string) => void
}) {
  const [type, setType] = useState("cms_webhook")
  const [name, setName] = useState("")
  const [priority, setPriority] = useState("overnight")
  const [submitting, setSubmitting] = useState(false)

  // GDrive-specific
  const [folderId, setFolderId] = useState("")

  // Dropbox-specific
  const [folderPath, setFolderPath] = useState("")

  async function handleSubmit() {
    if (!name.trim()) return
    setSubmitting(true)

    const config: Record<string, string> = {}
    if (type === "gdrive" && folderId) config.folder_id = folderId
    if (type === "dropbox" && folderPath) config.folder_path = folderPath

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_type: type,
        display_name: name,
        config,
        default_priority: priority,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      onCreated(data.api_key)
    }

    setSubmitting(false)
    setName("")
    setFolderId("")
    setFolderPath("")
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel type */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Channel type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHANNEL_TYPE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {CHANNEL_TYPE_META[type]?.description}
            </p>
          </div>

          {/* Display name */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Display name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Litigation GDrive Folder"
              className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>

          {/* GDrive: folder ID */}
          {type === "gdrive" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Google Drive Folder ID</label>
              <input
                type="text"
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                placeholder="e.g., 1a2b3c4d5e6f7g8h9i"
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Find this in the Drive folder URL after /folders/
              </p>
            </div>
          )}

          {/* Dropbox: folder path */}
          {type === "dropbox" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Dropbox Folder Path</label>
              <input
                type="text"
                value={folderPath}
                onChange={e => setFolderPath(e.target.value)}
                placeholder="e.g., /Legal/Active Cases"
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
            </div>
          )}

          {/* Default priority */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Default priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="soon">Soon (15-30 min)</SelectItem>
                <SelectItem value="overnight">Overnight</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? "Creating..." : "Create Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
