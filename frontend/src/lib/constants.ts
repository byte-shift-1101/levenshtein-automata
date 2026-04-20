export const TRIE_COLOR_ROOT = "#f59e0b"
export const TRIE_COLOR_ACCEPTING = "#10b981"
export const TRIE_COLOR_VISITED = "#6366f1"
export const TRIE_COLOR_END = "#8b5cf6"
export const TRIE_COLOR_DEFAULT = "#334155"
export const TRIE_COLOR_EDGE = "#0ea5e9"

export const TRIE_SIZE_ROOT = 8
export const TRIE_SIZE_END = 7
export const TRIE_SIZE_DEFAULT = 5

export const TRIE_H_SPACING = 90
export const TRIE_V_SPACING = 130

export const TRIE_SIGMA_SETTINGS = {
    renderEdgeLabels: true,
    labelFont: "Geist Variable, sans-serif",
    labelSize: 16,
    labelWeight: "700",
    edgeLabelFont: "Geist Variable, sans-serif",
    edgeLabelSize: 13,
    defaultEdgeColor: TRIE_COLOR_EDGE,
    labelColor: { color: "#e2e8f0" },
    edgeLabelColor: { color: "#38bdf8" },
    minCameraRatio: 0.05,
    maxCameraRatio: 8,
    defaultCameraState: { ratio: 0.35 },
} as const

export const AUTO_COLOR_ACCEPTING = "#10b981"
export const AUTO_COLOR_DEFAULT = "#6366f1"
export const AUTO_COLOR_EDGE = "#f97316"

export const AUTO_SIZE_ACCEPTING = 9
export const AUTO_SIZE_DEFAULT = 6

export const AUTO_RADIUS_MIN = 250
export const AUTO_RADIUS_PER_NODE = 60

export const AUTO_SIGMA_SETTINGS = {
    renderEdgeLabels: true,
    labelFont: "Geist Variable, sans-serif",
    labelSize: 16,
    labelWeight: "700",
    edgeLabelFont: "Geist Variable, sans-serif",
    edgeLabelSize: 13,
    defaultEdgeColor: AUTO_COLOR_EDGE,
    labelColor: { color: "#e2e8f0" },
    edgeLabelColor: { color: "#fb923c" },
    minCameraRatio: 0.05,
    maxCameraRatio: 8,
} as const
