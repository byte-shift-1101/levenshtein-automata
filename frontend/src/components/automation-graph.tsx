import { useEffect, useRef } from "react"
import { SigmaContainer, useLoadGraph, useSigma } from "@react-sigma/core"
import type { SearchResult } from "@/wasm/algorithm"
import { toTitleCase } from "@/lib/utils"
import { buildGraph } from "@/lib/graph"
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

const LEGEND = [
    { color: AUTO_COLOR_OP_MATCH, label: toTitleCase("match") },
    { color: AUTO_COLOR_OP_SUB, label: toTitleCase("substitution") },
    { color: AUTO_COLOR_OP_INS, label: toTitleCase("insertion") },
    { color: AUTO_COLOR_OP_DEL, label: toTitleCase("deletion") },
    { color: AUTO_COLOR_ACCEPTING, label: toTitleCase("accepting state") },
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

function AutomatonLoader({ result }: { result: SearchResult }) {
    const loadGraph = useLoadGraph()
    useEffect(() => {
        loadGraph(buildGraph(result))
    }, [result, loadGraph])
    return null
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

export function AutomatonGraphView({ result }: { result: SearchResult }) {
    const overlayRef = useRef<HTMLCanvasElement>(null)

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
                <AutomatonLoader result={result} />
                <ZoomGuard />
                <OvalOverlay canvasRef={overlayRef} />
            </SigmaContainer>
            <canvas
                ref={overlayRef}
                className="pointer-events-none absolute inset-0"
            />
        </div>
    )
}
