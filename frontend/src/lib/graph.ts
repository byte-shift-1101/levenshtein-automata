import Graph from "graphology"
import type { Op, SearchResult } from "@/wasm/algorithm"
import type { GraphPathMode } from "@/components/workspace"
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

export function buildGraph(
    result: SearchResult,
    pathMode: GraphPathMode = "success"
): Graph {
    const g = new Graph({ type: "directed", multi: true })

    const interLayerXGap = AUTO_X_SPACING
    const intraLayerYGap = AUTO_Y_SPACING
    const matchedWordsByState = collectMatchedWords(result)
    const visibleStateIds = collectVisibleStateIds(
        result,
        matchedWordsByState,
        pathMode
    )
    const visibleStates = result.states.filter((node) =>
        visibleStateIds.has(node.id)
    )

    const byDepth = new Map<number, typeof visibleStates>()
    for (const node of visibleStates) {
        const arr = byDepth.get(node.depth) ?? []
        arr.push(node)
        byDepth.set(node.depth, arr)
    }
    for (const arr of byDepth.values()) {
        arr.sort((a, b) => {
            const ap = formatPositions(a.positions)
            const bp = formatPositions(b.positions)
            return ap.localeCompare(bp) || a.id - b.id
        })
    }

    const layout = new Map<number, { x: number; y: number }>()
    for (const [depth, arr] of byDepth) {
        const total = arr.length
        arr.forEach((node, idx) => {
            layout.set(node.id, {
                x: depth * interLayerXGap,
                y: (idx - (total - 1) / 2) * intraLayerYGap,
            })
        })
    }

    for (const node of visibleStates) {
        const pos = layout.get(node.id) ?? { x: 0, y: 0 }
        const matchedWords = matchedWordsByState.get(node.id) ?? []
        const isMatch = matchedWords.length > 0
        const label = formatNodeLabel(node.positions, matchedWords)
        g.addNode(String(node.id), {
            x: pos.x,
            y: pos.y,
            size: isMatch ? AUTO_SIZE_NODE * 2.5 : AUTO_SIZE_NODE,
            label,
            color: "rgba(0,0,0,0)",
            fillColor: isMatch ? AUTO_COLOR_ACCEPTING : AUTO_COLOR_DEFAULT,
            borderColor: isMatch
                ? AUTO_COLOR_BORDER_ACCEPTING
                : AUTO_COLOR_BORDER_DEFAULT,
            accepting: isMatch,
            matchedWords,
        })
    }

    let eid = 0
    const transitions = sortTransitions(result.transitions).filter(
        (edge) => visibleStateIds.has(edge.from) && visibleStateIds.has(edge.to)
    )
    for (const edge of transitions) {
        const text = `${edge.ch} · ${OP_NAMES[edge.op]}`
        const color = OP_COLORS[edge.op]
        g.addEdgeWithKey(`e${eid++}`, String(edge.from), String(edge.to), {
            label: text,
            color,
            size: 1.5,
            forceLabel: true,
        })
    }

    return g
}

function collectVisibleStateIds(
    result: SearchResult,
    matchedWordsByState: Map<number, string[]>,
    pathMode: GraphPathMode
): Set<number> {
    if (pathMode === "all") {
        return new Set(result.states.map((node) => node.id))
    }

    const visible = new Set<number>()
    const reverse = new Map<number, number[]>()
    for (const edge of result.transitions) {
        const parents = reverse.get(edge.to) ?? []
        parents.push(edge.from)
        reverse.set(edge.to, parents)
    }

    const stack = [...matchedWordsByState.keys()]
    for (const id of stack) visible.add(id)

    while (stack.length > 0) {
        const id = stack.pop()
        if (id === undefined) continue
        for (const parent of reverse.get(id) ?? []) {
            if (visible.has(parent)) continue
            visible.add(parent)
            stack.push(parent)
        }
    }

    visible.add(0)
    return visible
}

function collectMatchedWords(result: SearchResult): Map<number, string[]> {
    const byState = new Map<number, Set<string>>()
    const matchSet = new Set(result.matches)

    for (const state of result.states) {
        for (const word of state.matchedWords ?? []) {
            if (!matchSet.has(word)) continue
            const words = byState.get(state.id) ?? new Set<string>()
            words.add(word)
            byState.set(state.id, words)
        }
    }

    const prefixes = new Map<number, string>()
    prefixes.set(0, "")
    const transitions = sortTransitions(result.transitions)

    let changed = true
    while (changed) {
        changed = false
        for (const edge of transitions) {
            const prefix = prefixes.get(edge.from)
            if (prefix === undefined || prefixes.has(edge.to)) continue
            prefixes.set(edge.to, prefix + edge.ch)
            changed = true
        }
    }

    for (const [stateId, prefix] of prefixes) {
        if (!matchSet.has(prefix)) continue
        const words = byState.get(stateId) ?? new Set<string>()
        words.add(prefix)
        byState.set(stateId, words)
    }

    return new Map(
        [...byState.entries()].map(([stateId, words]) => [
            stateId,
            [...words].sort((a, b) => a.localeCompare(b)),
        ])
    )
}

function sortTransitions(transitions: SearchResult["transitions"]) {
    return [...transitions].sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from
        if (a.to !== b.to) return a.to - b.to
        const pa = EDGE_OP_PRIORITY[a.op]
        const pb = EDGE_OP_PRIORITY[b.op]
        if (pa !== pb) return pa - pb
        return a.ch.localeCompare(b.ch)
    })
}

function formatPositions(positions: [number, number][]): string {
    if (positions.length === 0) return "{}"
    return [...positions]
        .sort((a, b) => a[0] - b[0] || a[1] - b[1])
        .map(([i, e]) => `${i}#${e}`)
        .join("\n")
}

function formatNodeLabel(
    positions: [number, number][],
    matchedWords: string[] | undefined
): string {
    const stateLabel = formatPositions(positions)
    const words = [...(matchedWords ?? [])].sort((a, b) => a.localeCompare(b))
    if (words.length === 0) return stateLabel
    return [stateLabel, ...words.map((word) => `= ${word}`)].join("\n")
}
