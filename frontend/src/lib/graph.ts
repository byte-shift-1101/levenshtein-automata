import Graph from "graphology"
import type { Op, SearchResult } from "@/wasm/algorithm"
import { toTitleCase } from "@/lib/utils"
import {
    AUTO_COLOR_ACCEPTING,
    AUTO_COLOR_DEFAULT,
    AUTO_COLOR_BORDER_ACCEPTING,
    AUTO_COLOR_BORDER_DEFAULT,
    AUTO_COLOR_OP_MATCH,
    AUTO_COLOR_OP_SUB,
    AUTO_COLOR_OP_INS,
    AUTO_COLOR_OP_DEL,
    AUTO_SIZE_NODE,
    AUTO_X_SPACING,
    AUTO_Y_SPACING,
} from "@/lib/constants"

export const OP_NAMES: Record<Op, string> = {
    match: toTitleCase("match"),
    sub: toTitleCase("substitution"),
    ins: toTitleCase("insertion"),
    del: toTitleCase("deletion"),
}

export const OP_COLORS: Record<Op, string> = {
    match: AUTO_COLOR_OP_MATCH,
    sub: AUTO_COLOR_OP_SUB,
    ins: AUTO_COLOR_OP_INS,
    del: AUTO_COLOR_OP_DEL,
}

const EDGE_OP_PRIORITY: Record<Op, number> = {
    match: 0,
    sub: 1,
    ins: 2,
    del: 3,
}

export function buildGraph(result: SearchResult): Graph {
    const g = new Graph({ type: "directed", multi: true })

    const editGraph = result.editGraph
    const interLayerXGap = AUTO_X_SPACING * 4
    const intraLayerYGap = AUTO_Y_SPACING * 4

    const byDist = new Map<number, typeof editGraph.nodes>()
    for (const node of editGraph.nodes) {
        const arr = byDist.get(node.dist) ?? []
        arr.push(node)
        byDist.set(node.dist, arr)
    }
    for (const arr of byDist.values()) {
        arr.sort((a, b) => a.string.localeCompare(b.string))
    }

    const layout = new Map<number, { x: number; y: number }>()
    for (const [dist, arr] of byDist) {
        const total = arr.length
        arr.forEach((node, idx) => {
            layout.set(node.id, {
                x: dist * interLayerXGap,
                y: (idx - (total - 1) / 2) * intraLayerYGap,
            })
        })
    }

    for (const node of editGraph.nodes) {
        const pos = layout.get(node.id) ?? { x: 0, y: 0 }
        const isRoot = node.id === 0
        const label = isRoot
            ? editGraph.query
            : node.string.length === 0
              ? "ε"
              : node.string
        g.addNode(String(node.id), {
            x: pos.x,
            y: pos.y,
            size: AUTO_SIZE_NODE,
            label,
            color: "rgba(0,0,0,0)",
            fillColor: node.accepting
                ? AUTO_COLOR_ACCEPTING
                : AUTO_COLOR_DEFAULT,
            borderColor: node.accepting
                ? AUTO_COLOR_BORDER_ACCEPTING
                : AUTO_COLOR_BORDER_DEFAULT,
            accepting: node.accepting,
        })
    }

    let eid = 0
    for (const edge of editGraph.edges) {
        const labels = [...edge.labels].sort((a, b) => {
            const pa = EDGE_OP_PRIORITY[a.op]
            const pb = EDGE_OP_PRIORITY[b.op]
            if (pa !== pb) return pa - pb
            return a.ch.localeCompare(b.ch)
        })
        const text = labels.map((l) => `${l.ch} · ${OP_NAMES[l.op]}`).join("\n")
        const color = OP_COLORS[labels[0]?.op ?? "match"]
        g.addEdgeWithKey(`e${eid++}`, String(edge.from), String(edge.to), {
            label: text,
            color,
            size: 1.5,
            forceLabel: true,
        })
    }

    return g
}
