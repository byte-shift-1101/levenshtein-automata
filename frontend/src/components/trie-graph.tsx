import { useEffect } from "react"
import { SigmaContainer, useLoadGraph, useSigma } from "@react-sigma/core"
import Graph from "graphology"
import { useTrieGraph } from "@/hooks/use-wasm"
import type { SearchResult, TrieGraph } from "@/wasm/algorithm"
import {
    TRIE_COLOR_ROOT,
    TRIE_COLOR_ACCEPTING,
    TRIE_COLOR_VISITED,
    TRIE_COLOR_END,
    TRIE_COLOR_DEFAULT,
    TRIE_COLOR_EDGE,
    TRIE_SIZE_ROOT,
    TRIE_SIZE_DEFAULT,
    TRIE_H_SPACING,
    TRIE_V_SPACING,
    TRIE_SIGMA_SETTINGS,
} from "@/lib/constants"

const LEGEND = [
    { color: TRIE_COLOR_ROOT, label: "Root" },
    { color: TRIE_COLOR_END, label: "Word end" },
    { color: TRIE_COLOR_VISITED, label: "Visited" },
    { color: TRIE_COLOR_ACCEPTING, label: "Match" },
    { color: TRIE_COLOR_DEFAULT, label: "Node" },
    { color: TRIE_COLOR_EDGE, label: "Edge" },
] as const

function TrieLegend() {
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

function computeLayout(data: TrieGraph): Map<number, { x: number; y: number }> {
    const children = new Map<number, number[]>()
    for (const edge of data.edges) {
        if (!children.has(edge.from)) children.set(edge.from, [])
        children.get(edge.from)!.push(edge.to)
    }
    const positions = new Map<number, { x: number; y: number }>()
    let leafX = 0

    function place(id: number, y: number, isRoot: boolean): number {
        const kids = children.get(id) ?? []
        if (kids.length === 0) {
            const x = leafX++ * TRIE_H_SPACING
            positions.set(id, { x, y })
            return x
        }
        const base = TRIE_V_SPACING + Math.max(0, kids.length - 2) * 40
        const gap = isRoot ? base * 2 : base
        const xs = kids.map((k) => place(k, y + gap, false))
        const x = (xs[0] + xs[xs.length - 1]) / 2
        positions.set(id, { x, y })
        return x
    }

    place(data.root, 0, true)
    return positions
}

function computePaths(data: TrieGraph): Map<number, string> {
    const children = new Map<number, number[]>()
    const edgeCh = new Map<number, string>()
    for (const edge of data.edges) {
        if (!children.has(edge.from)) children.set(edge.from, [])
        children.get(edge.from)!.push(edge.to)
        edgeCh.set(edge.to, edge.ch)
    }
    const paths = new Map<number, string>()

    function dfs(id: number, path: string) {
        paths.set(id, path)
        for (const kid of children.get(id) ?? []) {
            dfs(kid, path + (edgeCh.get(kid) ?? ""))
        }
    }

    dfs(data.root, "")
    return paths
}

function buildGraph(data: TrieGraph, result: SearchResult | null): Graph {
    const g = new Graph({ type: "directed", multi: false })
    const visited = new Set(result?.visitedTrieNodes ?? [])
    const accepting = new Set(result?.acceptingTrieNodes ?? [])
    const positions = computeLayout(data)
    const paths = computePaths(data)

    for (const node of data.nodes) {
        const pos = positions.get(node.id) ?? { x: 0, y: 0 }
        const isRoot = node.id === data.root
        const isAccepting = accepting.has(node.id)
        const isVisited = visited.has(node.id)

        let color = TRIE_COLOR_DEFAULT
        if (isRoot) color = TRIE_COLOR_ROOT
        else if (isAccepting) color = TRIE_COLOR_ACCEPTING
        else if (isVisited) color = TRIE_COLOR_VISITED
        else if (node.isEnd) color = TRIE_COLOR_END

        g.addNode(String(node.id), {
            x: pos.x,
            y: pos.y,
            size: isRoot ? TRIE_SIZE_ROOT : TRIE_SIZE_DEFAULT,
            label: isRoot ? "ε (root)" : (paths.get(node.id) ?? ""),
            color,
        })
    }

    for (const edge of data.edges) {
        if (!g.hasEdge(String(edge.from), String(edge.to))) {
            g.addEdge(String(edge.from), String(edge.to), {
                label: edge.ch,
                color: TRIE_COLOR_EDGE,
                size: 1,
                forceLabel: true,
            })
        }
    }

    return g
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
            if ((e.deltaY < 0 && atMin) || (e.deltaY > 0 && atMax)) {
                e.preventDefault()
            }
        }
        el.addEventListener("wheel", handler, { passive: false })
        return () => el.removeEventListener("wheel", handler)
    }, [sigma])
    return null
}

function HoverLabels() {
    const sigma = useSigma()
    useEffect(() => {
        const onEnter = ({ node }: { node: string }) => {
            sigma.getGraph().setNodeAttribute(node, "forceLabel", true)
            sigma.refresh()
        }
        const onLeave = ({ node }: { node: string }) => {
            sigma.getGraph().setNodeAttribute(node, "forceLabel", false)
            sigma.refresh()
        }
        sigma.on("enterNode", onEnter)
        sigma.on("leaveNode", onLeave)
        return () => {
            sigma.off("enterNode", onEnter)
            sigma.off("leaveNode", onLeave)
        }
    }, [sigma])
    return null
}

function TrieLoader({
    data,
    result,
}: {
    data: TrieGraph
    result: SearchResult | null
}) {
    const loadGraph = useLoadGraph()
    useEffect(() => {
        loadGraph(buildGraph(data, result))
    }, [data, result, loadGraph])
    return null
}

export function TrieGraphView({ result }: { result: SearchResult | null }) {
    const { graph: data, isLoading, refresh } = useTrieGraph()

    useEffect(() => {
        refresh()
    }, [refresh])

    if (isLoading || !data) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="animate-pulse text-sm text-muted-foreground">
                    Building trie…
                </span>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full">
            <TrieLegend />
            <SigmaContainer
                settings={TRIE_SIGMA_SETTINGS}
                style={{
                    width: "100%",
                    height: "100%",
                    background: "transparent",
                }}
            >
                <TrieLoader data={data} result={result} />
                <ZoomGuard />
                <HoverLabels />
            </SigmaContainer>
        </div>
    )
}
