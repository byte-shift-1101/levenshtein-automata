import { useEffect } from "react"
import { SigmaContainer, useLoadGraph } from "@react-sigma/core"
import Graph from "graphology"
import type { SearchResult } from "@/wasm/algorithm"
import {
    AUTO_COLOR_ACCEPTING,
    AUTO_COLOR_DEFAULT,
    AUTO_COLOR_EDGE,
    AUTO_SIZE_ACCEPTING,
    AUTO_SIZE_DEFAULT,
    AUTO_RADIUS_MIN,
    AUTO_RADIUS_PER_NODE,
    AUTO_SIGMA_SETTINGS,
} from "@/lib/constants"

function buildGraph(result: SearchResult): Graph {
    const g = new Graph({ type: "directed", multi: true })
    const count = result.states.length
    const radius = Math.max(AUTO_RADIUS_MIN, count * AUTO_RADIUS_PER_NODE)

    result.states.forEach((state, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2
        const posLabel = state.positions
            .map(([idx, ed]) => `${idx},${ed}`)
            .join(" | ")

        g.addNode(String(state.id), {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            size: state.accepting ? AUTO_SIZE_ACCEPTING : AUTO_SIZE_DEFAULT,
            label: posLabel || `S${state.id}`,
            color: state.accepting ? AUTO_COLOR_ACCEPTING : AUTO_COLOR_DEFAULT,
        })
    })

    result.transitions.forEach((edge, i) => {
        g.addEdgeWithKey(`e${i}`, String(edge.from), String(edge.to), {
            label: edge.ch,
            color: AUTO_COLOR_EDGE,
            size: 1.2,
        })
    })

    return g
}

function AutomatonLoader({ result }: { result: SearchResult }) {
    const loadGraph = useLoadGraph()

    useEffect(() => {
        loadGraph(buildGraph(result))
    }, [result, loadGraph])

    return null
}

export function AutomatonGraphView({ result }: { result: SearchResult }) {
    return (
        <SigmaContainer
            settings={AUTO_SIGMA_SETTINGS}
            style={{ width: "100%", height: "100%", background: "transparent" }}
        >
            <AutomatonLoader result={result} />
        </SigmaContainer>
    )
}
