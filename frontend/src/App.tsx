import { AnimatePresence, motion } from "framer-motion"
import { useWasmDictionary } from "@/hooks/use-wasm"
import { UploadPage } from "@/components/upload-page"
import { Workspace } from "@/components/workspace"

type View = "upload" | "workspace"

export function App() {
    const { status } = useWasmDictionary()
    const view: View = status === "ready" ? "workspace" : "upload"

    return (
        <div className="fixed inset-0 bg-background">
            <AnimatePresence mode="wait">
                {view === "upload" ? (
                    <motion.div
                        key="upload"
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                        <UploadPage />
                    </motion.div>
                ) : (
                    <motion.div
                        key="workspace"
                        className="absolute inset-0"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <Workspace />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
