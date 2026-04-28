import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, GitFork, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrieGraphView } from "@/components/trie-graph"
import { AutomatonGraphView } from "@/components/automation-graph"
import type { SearchResult } from "@/wasm/algorithm"
import type { GraphPanel, GraphPathMode } from "@/components/workspace"

interface GraphViewProps {
    panel: GraphPanel
    pathMode: GraphPathMode
    result: SearchResult | null
    onBack: () => void
}

export function GraphView({ panel, pathMode, result, onBack }: GraphViewProps) {
    return (
        <div className="relative h-full w-full overflow-hidden bg-background">
            <div className="absolute top-0 right-0 left-0 z-10 flex items-center gap-2 p-3">
                <AnimatePresence>
                    {panel === "automaton" && (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={onBack}
                                className="h-7 gap-1.5 text-xs"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Trie
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    key={panel}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 rounded-md border bg-card/80 px-2.5 py-1 backdrop-blur-sm"
                >
                    {panel === "trie" ? (
                        <GitFork className="h-3 w-3 text-muted-foreground" />
                    ) : (
                        <Workflow className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                        {panel === "trie" ? "Trie" : "Automaton"}
                    </span>
                    {panel === "automaton" && result && (
                        <>
                            <span className="text-xs text-muted-foreground/40">
                                ·
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                                {result.query}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground/60">
                                n={result.maxEdits ?? "?"}
                            </span>
                        </>
                    )}
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                {panel === "trie" ? (
                    <motion.div
                        key="trie"
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.25 }}
                    >
                        <TrieGraphView result={result} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="automaton"
                        className="absolute inset-0"
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {result && (
                            <AutomatonGraphView
                                result={result}
                                pathMode={pathMode}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
