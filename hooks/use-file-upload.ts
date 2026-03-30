// @ts-nocheck
"use client"

import { useState, useCallback, useRef } from "react"
import { uploadDocument } from "@/lib/api/ingest"

interface UploadState {
  file: File
  status: "queued" | "processing" | "done" | "error"
  result?: { document_id: string }
  error?: string
}

export function useFileUpload(caseId: string) {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const upload = useCallback(async (file: File) => {
    const entry: UploadState = { file, status: "queued" }
    setUploads(prev => [...prev, entry])

    setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "processing" } : u))
    try {
      const result = await uploadDocument(caseId, file)
      setUploads(prev => prev.map(u => u.file === file ? { ...u, status: "done", result } : u))
    } catch (err) {
      setUploads(prev => prev.map(u =>
        u.file === file ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : u
      ))
    }
  }, [caseId])

  const uploadFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(upload)
  }, [upload])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragging(false), [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }, [uploadFiles])

  const clearUploads = useCallback(() => setUploads([]), [])

  return { uploads, isDragging, inputRef, uploadFiles, onDragOver, onDragLeave, onDrop, clearUploads }
}
