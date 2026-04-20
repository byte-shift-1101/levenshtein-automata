import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { BackgroundComponent } from "@/components/background-gradient"
import { FileUpload, type UploadedFile } from "@/components/file-upload"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useWasmDictionary } from "@/hooks/use-wasm"

export function UploadPage() {
    const { status, wordCount, error, loadFromFile } = useWasmDictionary()
    const [files, setFiles] = useState<UploadedFile[]>([])

    const handleFiles = useCallback(
        async (incoming: File[]) => {
            const file = incoming[0]
            if (!file) return

            const entry: UploadedFile = {
                id: crypto.randomUUID(),
                file,
                progress: 30,
                status: "uploading",
            }
            setFiles([entry])
            await loadFromFile(file)
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === entry.id
                        ? {
                              ...f,
                              progress: 100,
                              status: error ? "error" : "completed",
                          }
                        : f
                )
            )
        },
        [loadFromFile, error]
    )

    const handleRemove = useCallback((id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id))
    }, [])

    return (
        <div className="relative flex h-full w-full items-center justify-center">
            <BackgroundComponent />

            <motion.div
                className="z-10 w-full max-w-lg px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>Levenshtein Automata</CardTitle>
                        <CardDescription>
                            Load a JSON dictionary to visualize fuzzy search
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4 pt-4">
                        <FileUpload
                            files={files}
                            onFilesChange={handleFiles}
                            onFileRemove={handleRemove}
                        />

                        {status === "loading" && (
                            <div className="flex justify-center">
                                <Badge variant="secondary" className="gap-1.5">
                                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                                    Building trie…
                                </Badge>
                            </div>
                        )}

                        {status === "error" && error && (
                            <p className="text-center text-sm text-destructive">
                                {error}
                            </p>
                        )}

                        {status === "ready" && (
                            <div className="flex justify-center">
                                <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    {wordCount.toLocaleString()} words loaded
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
