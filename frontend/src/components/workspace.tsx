import { useState, useCallback } from "react"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"
import { SearchPanel } from "@/components/search-panel"
import { GraphView } from "@/components/graph-view"
import type { SearchResult } from "@/wasm/algorithm"

export type GraphPanel = "trie" | "automaton"

export function Workspace() {
    const [panel, setPanel] = useState<GraphPanel>("trie")
    const [result, setResult] = useState<SearchResult | null>(null)

    const handleResult = useCallback((r: SearchResult) => {
        setResult(r)
        setPanel("automaton")
    }, [])

    const handleBack = useCallback(() => {
        setPanel("trie")
    }, [])

    return (
        <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize="22%" minSize="18%" maxSize="32%">
                <SearchPanel onResult={handleResult} />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="78%">
                <GraphView panel={panel} result={result} onBack={handleBack} />
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}
