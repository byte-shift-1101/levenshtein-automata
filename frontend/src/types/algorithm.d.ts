declare module "@/wasm/algorithm" {
    export interface TrieNode {
        id: number
        ch: string | null
        isEnd: boolean
        depth: number
    }

    export interface TrieEdge {
        from: number
        to: number
        ch: string
    }

    export interface TrieGraph {
        nodes: TrieNode[]
        edges: TrieEdge[]
        root: number
    }

    export interface AutomatonNode {
        id: number
        positions: [number, number][]
        accepting: boolean
    }

    export interface AutomatonEdge {
        from: number
        to: number
        ch: string
        trieNode: number
    }

    export interface SearchResult {
        query: string
        maxEdits: number
        matches: string[]
        states: AutomatonNode[]
        transitions: AutomatonEdge[]
        visitedTrieNodes: number[]
        acceptingTrieNodes: number[]
        truncated: boolean
    }

    export function init(bytes: Uint8Array): number
    export function reset(): void
    export function search(word: string, n: number): SearchResult
    export function trie_graph(): TrieGraph
}
