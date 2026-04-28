import { useState, useCallback, useEffect, useRef } from "react"
import { Search, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardAction,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearch, useWasmDictionary } from "@/hooks/use-wasm"
import type { SearchResult } from "@/wasm/algorithm"
import { toTitleCase } from "@/lib/utils"
import type { GraphPathMode } from "@/components/workspace"

interface SearchPanelProps {
    pathMode: GraphPathMode
    onPathModeChange: (mode: GraphPathMode) => void
    onResult: (result: SearchResult) => void
}

const N_OPTIONS = [0, 1, 2, 3] as const

export function SearchPanel({
    pathMode,
    onPathModeChange,
    onResult,
}: SearchPanelProps) {
    const { status, wordCount, reset } = useWasmDictionary()
    const { result, isSearching, error, search, clear } = useSearch()
    const [word, setWord] = useState("")
    const [n, setN] = useState(1)
    const onResultRef = useRef(onResult)

    useEffect(() => {
        onResultRef.current = onResult
    })

    useEffect(() => {
        if (result) onResultRef.current(result)
    }, [result])

    const handleSearch = useCallback(() => {
        if (!word.trim()) return
        search(word.trim().toLowerCase(), n)
    }, [word, n, search])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") handleSearch()
        },
        [handleSearch]
    )

    const handleClear = useCallback(() => {
        setWord("")
        clear()
    }, [clear])

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden border-r p-3">
            <Card size="sm">
                <CardHeader>
                    <CardTitle>Dictionary</CardTitle>
                    <CardAction>
                        <div className="flex items-center gap-1.5">
                            <Badge
                                variant="outline"
                                className="gap-1.5 text-xs"
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        status === "ready"
                                            ? "bg-emerald-400"
                                            : "bg-amber-400"
                                    }`}
                                />
                                {toTitleCase(status)}
                            </Badge>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={reset}
                                title="Reset dictionary"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <span className="text-2xl font-semibold tabular-nums">
                        {wordCount.toLocaleString()}
                    </span>
                    <span className="ml-1.5 text-sm text-muted-foreground">
                        words
                    </span>
                </CardContent>
            </Card>

            <Card size="sm">
                <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                            Query
                        </label>
                        <div className="relative">
                            <Input
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="apple"
                                className="pr-8 font-mono text-sm"
                                disabled={status !== "ready"}
                            />
                            {word && (
                                <button
                                    onClick={handleClear}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <span className="text-xs leading-none">
                                        ✕
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                            Max Edits
                        </label>
                        <div className="flex gap-1.5">
                            {N_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setN(opt)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-md border font-mono text-sm transition-colors ${
                                        n === opt
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={
                            !word.trim() || status !== "ready" || isSearching
                        }
                        className="w-full gap-2"
                    >
                        <Search className="h-3.5 w-3.5" />
                        {isSearching ? "Searching…" : "Search"}
                    </Button>

                    {error && (
                        <p className="text-xs text-destructive">{error}</p>
                    )}
                </CardContent>
            </Card>

            <Card size="sm">
                <CardContent className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                        Graph Paths
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            onClick={() => onPathModeChange("success")}
                            className={`h-8 rounded-md border px-2 text-xs font-medium transition-colors ${
                                pathMode === "success"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                        >
                            Matches
                        </button>
                        <button
                            onClick={() => onPathModeChange("all")}
                            className={`h-8 rounded-md border px-2 text-xs font-medium transition-colors ${
                                pathMode === "all"
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                        >
                            All
                        </button>
                    </div>
                </CardContent>
            </Card>

            <Card size="sm" className="min-h-0 flex-1">
                <CardHeader>
                    <CardTitle>Matches</CardTitle>
                    <CardAction>
                        {result && (
                            <Badge
                                variant="secondary"
                                className="text-xs tabular-nums"
                            >
                                {result.matches.length}
                                {result.truncated && "+"}
                            </Badge>
                        )}
                    </CardAction>
                </CardHeader>

                <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full min-h-0 px-3 pb-3">
                        {isSearching && (
                            <div className="flex flex-col gap-2 pt-1">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className="h-7 w-full" />
                                ))}
                            </div>
                        )}

                        {!isSearching &&
                            result &&
                            result.matches.length === 0 && (
                                <p className="py-6 text-center text-xs text-muted-foreground">
                                    No matches found
                                </p>
                            )}

                        {!isSearching &&
                            result &&
                            result.matches.length > 0 && (
                                <div className="flex flex-col gap-0.5 pt-1">
                                    {result.matches.map((match) => (
                                        <div
                                            key={match}
                                            className="rounded-md px-2.5 py-1.5 font-mono text-sm transition-colors hover:bg-muted"
                                        >
                                            {match}
                                        </div>
                                    ))}
                                    {result.truncated && (
                                        <p className="pt-2 text-center text-xs text-muted-foreground">
                                            Results truncated
                                        </p>
                                    )}
                                </div>
                            )}

                        {!isSearching && !result && (
                            <p className="py-6 text-center text-xs text-muted-foreground">
                                Run a search to see matches
                            </p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
