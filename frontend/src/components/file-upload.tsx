import * as React from "react"
import { UploadCloud, X, CheckCircle2, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export interface UploadedFile {
    id: string
    file: File
    progress: number
    status: "uploading" | "completed" | "error"
}

interface FileUploadProps {
    className?: string
    files: UploadedFile[]
    onFilesChange: (files: File[]) => void
    onFileRemove: (id: string) => void
    onClose?: () => void
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
    ({ className, files, onFilesChange, onFileRemove, onClose }, ref) => {
        const [isDragging, setIsDragging] = React.useState(false)
        const inputRef = React.useRef<HTMLInputElement>(null)

        const stop = (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
        }

        const handleDrop = React.useCallback(
            (e: React.DragEvent) => {
                stop(e)
                setIsDragging(false)
                const dropped = Array.from(e.dataTransfer.files)
                if (dropped.length) onFilesChange(dropped)
            },
            [onFilesChange]
        )

        const handleSelect = React.useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const selected = Array.from(e.target.files || [])
                if (selected.length) onFilesChange(selected)
            },
            [onFilesChange]
        )

        const trigger = React.useCallback(() => {
            inputRef.current?.click()
        }, [])

        const formatSize = React.useCallback((bytes: number) => {
            if (!bytes) return "0 KB"
            const k = 1024
            const sizes = ["Bytes", "KB", "MB", "GB"]
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
        }, [])

        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "w-full max-w-lg rounded-xl border bg-background shadow-sm",
                    className
                )}
            >
                <div className="p-6">
                    <div className="flex justify-between">
                        <div className="flex gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <UploadCloud className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Upload files
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Select and upload files
                                </p>
                            </div>
                        </div>

                        {onClose && (
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <div
                        onDragEnter={(e) => {
                            stop(e)
                            setIsDragging(true)
                        }}
                        onDragLeave={(e) => {
                            stop(e)
                            setIsDragging(false)
                        }}
                        onDragOver={stop}
                        onDrop={handleDrop}
                        onClick={trigger}
                        className={cn(
                            "mt-6 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition",
                            isDragging
                                ? "border-primary bg-primary/10"
                                : "border-muted-foreground/30 hover:border-primary/50"
                        )}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            className="hidden"
                            aria-label="Upload files"
                            title="Upload files"
                            onChange={handleSelect}
                        />

                        <UploadCloud className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                        <p className="font-medium">Drag & drop or click</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Max 50MB
                        </p>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="space-y-4 border-t p-6">
                        <AnimatePresence>
                            {files.map((f) => (
                                <motion.div
                                    key={f.id}
                                    layout
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs">
                                            {f.file.type
                                                .split("/")[1]
                                                ?.slice(0, 3)
                                                .toUpperCase() || "FILE"}
                                        </div>

                                        <div>
                                            <p className="max-w-xs truncate text-sm">
                                                {f.file.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {f.status === "uploading"
                                                    ? `${formatSize((f.file.size * f.progress) / 100)} / ${formatSize(f.file.size)}`
                                                    : formatSize(f.file.size)}
                                            </p>

                                            {f.status === "uploading" && (
                                                <Progress
                                                    value={f.progress}
                                                    className="mt-1 h-1"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {f.status === "completed" && (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => onFileRemove(f.id)}
                                        >
                                            {f.status === "completed" ? (
                                                <Trash2 className="h-4 w-4" />
                                            ) : (
                                                <X className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        )
    }
)
