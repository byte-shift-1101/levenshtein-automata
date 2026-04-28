export const TRIE_COLOR_ROOT = "#f59e0b"
export const TRIE_COLOR_ACCEPTING = "#10b981"
export const TRIE_COLOR_VISITED = "#6366f1"
export const TRIE_COLOR_END = "#f43f5e"
export const TRIE_COLOR_DEFAULT = "#334155"
export const TRIE_COLOR_EDGE = "#0ea5e9"

export const TRIE_SIZE_ROOT = 4
export const TRIE_SIZE_DEFAULT = 2

export const TRIE_H_SPACING = 200
export const TRIE_V_SPACING = 280

export const TRIE_SIGMA_SETTINGS = {
    renderEdgeLabels: true,
    labelFont: "Geist Variable, sans-serif",
    labelSize: 16,
    labelWeight: "700",
    edgeLabelFont: "Geist Variable, sans-serif",
    edgeLabelSize: 13,
    defaultEdgeColor: TRIE_COLOR_EDGE,
    labelColor: { color: "#0f172a" },
    edgeLabelColor: { color: "#b45309" },
    labelRenderedSizeThreshold: Infinity,
    minCameraRatio: 0.05,
    maxCameraRatio: 8,
    defaultCameraState: { ratio: 0.35 },
} as const

export const AUTO_COLOR_ACCEPTING = "#10b981"
export const AUTO_COLOR_DEFAULT = "#6366f1"
export const AUTO_COLOR_BORDER_ACCEPTING = "#f8fafc"
export const AUTO_COLOR_BORDER_DEFAULT = "#6366f1"

export const AUTO_COLOR_OP_MATCH = "#10b981"
export const AUTO_COLOR_OP_SUB = "#f59e0b"
export const AUTO_COLOR_OP_INS = "#f43f5e"
export const AUTO_COLOR_OP_DEL = "#8b5cf6"

export const AUTO_SIZE_NODE = 8

export const AUTO_X_SPACING = 500
export const AUTO_Y_SPACING = 130

export const AUTO_OVAL_FONT = `600 11px "Geist Variable", sans-serif`
export const AUTO_OVAL_LINE_H = 15
export const AUTO_OVAL_H_PAD = 14
export const AUTO_OVAL_V_PAD = 8

export const AUTO_BASE_SIGMA_SETTINGS = {
    renderLabels: false,
    renderEdgeLabels: true,
    edgeLabelFont: "Geist Variable, sans-serif",
    edgeLabelSize: 11,
    edgeLabelColor: { color: "#cbd5e1" },
    labelRenderedSizeThreshold: Infinity,
    minCameraRatio: 0.05,
    maxCameraRatio: 8,
    defaultCameraState: { ratio: 0.5 },
} as const
