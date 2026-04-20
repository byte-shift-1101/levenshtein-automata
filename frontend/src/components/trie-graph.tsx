import { useEffect } from "react"
import { SigmaContainer, useLoadGraph } from "@react-sigma/core"
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
    TRIE_SIZE_END,
    TRIE_SIZE_DEFAULT,
    TRIE_H_SPACING,
    TRIE_V_SPACING,
    TRIE_SIGMA_SETTINGS,
} from "@/lib/constants"

function computeLayout(data: TrieGraph): Map<number, { x: number; y: number }> {
    const children = new Map<number, number[]>()
    for (const edge of data.edges) {
        if (!children.has(edge.from)) children.set(edge.from, [])
        children.get(edge.from)!.push(edge.to)
    }
    const positions = new Map<number, { x: number; y: number }>()
    let leafX = 0

    function place(id: number, depth: number): number {
        const kids = children.get(id) ?? []
        if (kids.length === 0) {
            const x = leafX++ * TRIE_H_SPACING
            positions.set(id, { x, y: depth * TRIE_V_SPACING })
            return x
        }
        const xs = kids.map((k) => place(k, depth + 1))
        const x = (xs[0] + xs[xs.length - 1]) / 2
        positions.set(id, { x, y: depth * TRIE_V_SPACING })
        return x
    }

    place(data.root, 0)
    return positions
}

function buildGraph(data: TrieGraph, result: SearchResult | null): Graph {
    const g = new Graph({ type: "directed", multi: false })
    const visited = new Set(result?.visitedTrieNodes ?? [])
    const accepting = new Set(result?.acceptingTrieNodes ?? [])
    const positions = computeLayout(data)

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
            size: isRoot
                ? TRIE_SIZE_ROOT
                : node.isEnd
                  ? TRIE_SIZE_END
                  : TRIE_SIZE_DEFAULT,
            label: isRoot ? "ε" : (node.ch ?? ""),
            color,
        })
    }

    for (const edge of data.edges) {
        if (!g.hasEdge(String(edge.from), String(edge.to))) {
            g.addEdge(String(edge.from), String(edge.to), {
                label: edge.ch,
                color: TRIE_COLOR_EDGE,
                size: 1,
            })
        }
    }

    return g
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
        <SigmaContainer
            settings={TRIE_SIGMA_SETTINGS}
            style={{ width: "100%", height: "100%", background: "transparent" }}
        >
            <TrieLoader data={data} result={result} />
        </SigmaContainer>
    )
}
