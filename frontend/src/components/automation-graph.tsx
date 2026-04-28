import { useEffect, useMemo, useRef, useState } from "react"
import { SigmaContainer, useLoadGraph, useSigma } from "@react-sigma/core"
import type { SearchResult } from "@/wasm/algorithm"
import { toTitleCase } from "@/lib/utils"
import { buildGraph } from "@/lib/graph"
import type { GraphPathMode } from "@/components/workspace"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AUTO_COLOR_ACCEPTING,
    AUTO_COLOR_DEFAULT,
    AUTO_COLOR_BORDER_DEFAULT,
    AUTO_COLOR_OP_MATCH,
    AUTO_COLOR_OP_SUB,
    AUTO_COLOR_OP_INS,
    AUTO_COLOR_OP_DEL,
    AUTO_BASE_SIGMA_SETTINGS,
    AUTO_OVAL_FONT,
    AUTO_OVAL_LINE_H,
    AUTO_OVAL_H_PAD,
    AUTO_OVAL_V_PAD,
} from "@/lib/constants"

interface DictionaryDefinition {
    definition: string
    example?: string
    synonyms?: string[]
    antonyms?: string[]
}

interface DictionaryMeaning {
    partOfSpeech: string
    definitions: DictionaryDefinition[]
    synonyms?: string[]
    antonyms?: string[]
}

interface DictionaryPhonetic {
    text?: string
    audio?: string
    sourceUrl?: string
}

interface DictionaryEntry {
    word: string
    phonetic?: string
    phonetics?: DictionaryPhonetic[]
    meanings?: DictionaryMeaning[]
    sourceUrls?: string[]
}

type DictionaryState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error" }
    | { status: "success"; entries: DictionaryEntry[] }

const LEGEND = [
    { color: AUTO_COLOR_OP_MATCH, label: toTitleCase("match") },
    { color: AUTO_COLOR_OP_SUB, label: toTitleCase("substitution") },
    { color: AUTO_COLOR_OP_INS, label: toTitleCase("insertion") },
    { color: AUTO_COLOR_OP_DEL, label: toTitleCase("deletion") },
    { color: AUTO_COLOR_ACCEPTING, label: toTitleCase("matched word") },
    { color: AUTO_COLOR_DEFAULT, label: toTitleCase("state") },
] as const

function drawOval(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    fillColor: string,
    borderColor: string,
    accepting: boolean
) {
    ctx.save()
    try {
        const lines = label.split("\n").filter(Boolean)
        ctx.font = AUTO_OVAL_FONT
        const maxW = Math.max(
            ...lines.map((line) => ctx.measureText(line).width),
            24
        )
        const rX = maxW / 2 + AUTO_OVAL_H_PAD
        const rY = (lines.length * AUTO_OVAL_LINE_H) / 2 + AUTO_OVAL_V_PAD

        ctx.beginPath()
        ctx.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2)
        ctx.fillStyle = fillColor
        ctx.fill()

        ctx.strokeStyle = borderColor
        ctx.lineWidth = accepting ? 2.4 : 1.2
        ctx.stroke()

        if (accepting) {
            ctx.beginPath()
            ctx.ellipse(
                x,
                y,
                Math.max(rX - 5, 4),
                Math.max(rY - 5, 4),
                0,
                0,
                Math.PI * 2
            )
            ctx.strokeStyle = borderColor
            ctx.lineWidth = 1.5
            ctx.stroke()
        }

        ctx.fillStyle = "#f8fafc"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        const totalH = (lines.length - 1) * AUTO_OVAL_LINE_H
        lines.forEach((line, i) => {
            ctx.fillText(line, x, y - totalH / 2 + i * AUTO_OVAL_LINE_H)
        })
    } finally {
        ctx.restore()
    }
}

function OvalOverlay({
    canvasRef,
}: {
    canvasRef: React.RefObject<HTMLCanvasElement | null>
}) {
    const sigma = useSigma()

    useEffect(() => {
        const render = () => {
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext("2d")
            if (!ctx) return

            const container = sigma.getContainer()
            const w = container.clientWidth
            const h = container.clientHeight
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h

            ctx.clearRect(0, 0, w, h)

            sigma.getGraph().forEachNode((_nodeId, attrs) => {
                const label = attrs.label as string | undefined
                if (label === undefined) return
                const displayLabel = label.length === 0 ? "ε" : label
                const fillColor =
                    (attrs.fillColor as string | undefined) ??
                    AUTO_COLOR_DEFAULT
                const borderColor =
                    (attrs.borderColor as string | undefined) ??
                    AUTO_COLOR_BORDER_DEFAULT
                const accepting = Boolean(attrs.accepting)
                const { x, y } = sigma.graphToViewport({
                    x: attrs.x as number,
                    y: attrs.y as number,
                })
                drawOval(
                    ctx,
                    x,
                    y,
                    displayLabel,
                    fillColor,
                    borderColor,
                    accepting
                )
            })
        }

        const raf = requestAnimationFrame(() => {
            sigma.refresh()
            render()
        })

        sigma.on("afterRender", render)
        sigma.on("afterProcess", render)
        return () => {
            cancelAnimationFrame(raf)
            sigma.off("afterRender", render)
            sigma.off("afterProcess", render)
        }
    }, [sigma, canvasRef])

    return null
}

function ZoomGuard() {
    const sigma = useSigma()
    useEffect(() => {
        const el = sigma.getContainer()
        const handler = (e: WheelEvent) => {
            const ratio = sigma.getCamera().ratio
            const s = sigma.getSettings()
            const atMin = ratio <= (s.minCameraRatio ?? 0)
            const atMax = ratio >= (s.maxCameraRatio ?? Infinity)
            if ((e.deltaY < 0 && atMin) || (e.deltaY > 0 && atMax))
                e.preventDefault()
        }
        el.addEventListener("wheel", handler, { passive: false })
        return () => el.removeEventListener("wheel", handler)
    }, [sigma])
    return null
}

function AutomatonLoader({
    result,
    pathMode,
}: {
    result: SearchResult
    pathMode: GraphPathMode
}) {
    const loadGraph = useLoadGraph()
    useEffect(() => {
        loadGraph(buildGraph(result, pathMode))
    }, [result, pathMode, loadGraph])
    return null
}

function NodeClickHandler({
    onMatchedWords,
}: {
    onMatchedWords: (words: string[]) => void
}) {
    const sigma = useSigma()

    useEffect(() => {
        const handleClick = ({ node }: { node: string }) => {
            const attrs = sigma.getGraph().getNodeAttributes(node)
            const words = attrs.matchedWords as string[] | undefined
            if (!words || words.length === 0) return
            onMatchedWords(words)
        }

        sigma.on("clickNode", handleClick)
        return () => {
            sigma.off("clickNode", handleClick)
        }
    }, [sigma, onMatchedWords])

    return null
}

function WordDialog({
    words,
    onClose,
}: {
    words: string[]
    onClose: () => void
}) {
    const sortedWords = useMemo(
        () => [...new Set(words)].sort((a, b) => a.localeCompare(b)),
        [words]
    )
    const [selectedWord, setSelectedWord] = useState(sortedWords[0] ?? "")
    const [state, setState] = useState<DictionaryState>({ status: "idle" })

    useEffect(() => {
        setSelectedWord(sortedWords[0] ?? "")
    }, [sortedWords])

    useEffect(() => {
        if (!selectedWord) return
        const controller = new AbortController()
        setState({ status: "loading" })

        fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
                selectedWord
            )}`,
            { signal: controller.signal }
        )
            .then(async (res) => {
                if (!res.ok) throw new Error("not found")
                const data = (await res.json()) as DictionaryEntry[]
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error("not found")
                }
                setState({ status: "success", entries: data })
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                )
                    return
                setState({ status: "error" })
            })

        return () => controller.abort()
    }, [selectedWord])

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
        >
            <DialogContent className="flex max-h-[82vh] max-w-2xl flex-col overflow-hidden p-0 sm:max-w-2xl">
                <DialogHeader className="border-b px-4 py-3 pr-11">
                    <DialogTitle>{selectedWord}</DialogTitle>
                    <DialogDescription>Dictionary entry</DialogDescription>
                </DialogHeader>

                {sortedWords.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2">
                        {sortedWords.map((word) => (
                            <button
                                key={word}
                                onClick={() => setSelectedWord(word)}
                                className={`h-7 rounded-md border px-2.5 font-mono text-xs transition-colors ${
                                    word === selectedWord
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                }`}
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                )}

                <ScrollArea className="min-h-0 flex-1 px-4 py-3">
                    {state.status === "loading" && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            Loading dictionary data…
                        </p>
                    )}

                    {state.status === "error" && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No word found
                        </p>
                    )}

                    {state.status === "success" && (
                        <div className="flex flex-col gap-4 pb-2">
                            {state.entries.map((entry, entryIndex) => (
                                <DictionaryEntryView
                                    key={`${entry.word}-${entryIndex}`}
                                    entry={entry}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

function DictionaryEntryView({ entry }: { entry: DictionaryEntry }) {
    const phonetics = (entry.phonetics ?? []).filter(
        (phonetic) => phonetic.text || phonetic.audio
    )

    return (
        <section className="flex flex-col gap-3 rounded-lg border bg-background/50 p-3">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-semibold">
                        {entry.word}
                    </span>
                    {entry.phonetic && (
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                            {entry.phonetic}
                        </span>
                    )}
                </div>

                {phonetics.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {phonetics.map((phonetic, index) => (
                            <div
                                key={`${phonetic.text ?? "audio"}-${index}`}
                                className="flex flex-wrap items-center gap-2"
                            >
                                {phonetic.text && (
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {phonetic.text}
                                    </span>
                                )}
                                {phonetic.audio && (
                                    <audio
                                        controls
                                        src={phonetic.audio}
                                        className="h-8 w-full rounded-full"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(entry.meanings ?? []).map((meaning, meaningIndex) => (
                <div
                    key={`${meaning.partOfSpeech}-${meaningIndex}`}
                    className="flex flex-col gap-2"
                >
                    <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                        {meaning.partOfSpeech}
                    </div>
                    <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                        {meaning.definitions.slice(0, 5).map((def, index) => (
                            <li key={`${def.definition}-${index}`}>
                                <p>{def.definition}</p>
                                {def.example && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {def.example}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            ))}

            {(entry.sourceUrls ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 border-t pt-2">
                    {entry.sourceUrls?.map((url) => (
                        <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline-offset-4 hover:underline"
                        >
                            Source
                        </a>
                    ))}
                </div>
            )}
        </section>
    )
}

function AutomatonLegend() {
    return (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border bg-card/80 px-3 py-2.5 backdrop-blur-sm">
            {LEGEND.map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                    <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: color }}
                    />
                    <span className="text-xs text-muted-foreground">
                        {label}
                    </span>
                </div>
            ))}
        </div>
    )
}

export function AutomatonGraphView({
    result,
    pathMode,
}: {
    result: SearchResult
    pathMode: GraphPathMode
}) {
    const overlayRef = useRef<HTMLCanvasElement>(null)
    const [dialogWords, setDialogWords] = useState<string[] | null>(null)

    return (
        <div className="relative h-full w-full">
            <AutomatonLegend />
            <SigmaContainer
                settings={{
                    ...AUTO_BASE_SIGMA_SETTINGS,
                    defaultDrawNodeHover: () => {},
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    background: "transparent",
                }}
            >
                <AutomatonLoader result={result} pathMode={pathMode} />
                <NodeClickHandler onMatchedWords={setDialogWords} />
                <ZoomGuard />
                <OvalOverlay canvasRef={overlayRef} />
            </SigmaContainer>
            <canvas
                ref={overlayRef}
                className="pointer-events-none absolute inset-0"
            />
            {dialogWords && (
                <WordDialog
                    words={dialogWords}
                    onClose={() => setDialogWords(null)}
                />
            )}
        </div>
    )
}
