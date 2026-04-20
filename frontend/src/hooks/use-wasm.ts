import type { SearchResult, TrieGraph } from "@/wasm/algorithm"
import { useCallback, useEffect, useRef, useState } from "react"

const _mod = await import("@/wasm/algorithm")

type DictStatus = "idle" | "loading" | "ready" | "error"

let _dictStatus: DictStatus = "idle"
let _wordCount = 0
let _dictError: string | null = null
const _listeners = new Set<() => void>()

function notifyListeners() {
    _listeners.forEach((fn) => fn())
}

export interface DictionaryState {
    status: DictStatus
    wordCount: number
    error: string | null
    loadFromFile: (file: File) => Promise<void>
    loadFromUrl: (url: string) => Promise<void>
    loadFromBytes: (bytes: Uint8Array) => Promise<void>
    reset: () => void
}

export function useWasmDictionary(): DictionaryState {
    const [, rerender] = useState(0)

    useEffect(() => {
        const cb = () => rerender((n) => n + 1)
        _listeners.add(cb)
        return () => {
            _listeners.delete(cb)
        }
    }, [])

    const loadFromBytes = useCallback(async (bytes: Uint8Array) => {
        _dictStatus = "loading"
        _dictError = null
        notifyListeners()
        try {
            _mod.reset()
            _wordCount = _mod.init(bytes)
            _dictStatus = "ready"
        } catch (e) {
            _dictStatus = "error"
            _dictError = e instanceof Error ? e.message : String(e)
        }
        notifyListeners()
    }, [])

    const loadFromFile = useCallback(
        async (file: File) => {
            const buf = await file.arrayBuffer()
            await loadFromBytes(new Uint8Array(buf))
        },
        [loadFromBytes]
    )

    const loadFromUrl = useCallback(
        async (url: string) => {
            _dictStatus = "loading"
            _dictError = null
            notifyListeners()
            try {
                const res = await fetch(url)
                if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`)
                const buf = await res.arrayBuffer()
                await loadFromBytes(new Uint8Array(buf))
            } catch (e) {
                _dictStatus = "error"
                _dictError = e instanceof Error ? e.message : String(e)
                notifyListeners()
            }
        },
        [loadFromBytes]
    )

    const reset = useCallback(() => {
        _mod.reset()
        _dictStatus = "idle"
        _wordCount = 0
        _dictError = null
        notifyListeners()
    }, [])

    return {
        status: _dictStatus,
        wordCount: _wordCount,
        error: _dictError,
        loadFromFile,
        loadFromUrl,
        loadFromBytes,
        reset,
    }
}

export interface SearchState {
    result: SearchResult | null
    isSearching: boolean
    error: string | null
    search: (word: string, n: number) => void
    clear: () => void
}

export function useSearch(): SearchState {
    const [result, setResult] = useState<SearchResult | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const search = useCallback((word: string, n: number) => {
        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        if (_dictStatus !== "ready") {
            setError("Dictionary not loaded")
            return
        }
        if (!word || !/^[a-z]+$/.test(word)) {
            setError("Word must be non-empty ASCII lowercase")
            return
        }
        if (n < 0) {
            setError("n must be >= 0")
            return
        }

        setIsSearching(true)
        setError(null)

        queueMicrotask(() => {
            if (ac.signal.aborted) return
            try {
                const res = _mod.search(word, n)
                console.log("[search result]", res)
                if (!ac.signal.aborted) {
                    setResult(res)
                    setIsSearching(false)
                }
            } catch (e) {
                if (!ac.signal.aborted) {
                    setError(e instanceof Error ? e.message : String(e))
                    setIsSearching(false)
                }
            }
        })
    }, [])

    const clear = useCallback(() => {
        abortRef.current?.abort()
        setResult(null)
        setError(null)
        setIsSearching(false)
    }, [])

    return { result, isSearching, error, search, clear }
}

export interface TrieGraphState {
    graph: TrieGraph | null
    isLoading: boolean
    error: string | null
    refresh: () => void
}

export function useTrieGraph(): TrieGraphState {
    const [graph, setGraph] = useState<TrieGraph | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(() => {
        if (_dictStatus !== "ready") {
            setError("Dictionary not loaded")
            return
        }
        setIsLoading(true)
        setError(null)
        queueMicrotask(() => {
            try {
                setGraph(_mod.trie_graph())
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
            } finally {
                setIsLoading(false)
            }
        })
    }, [])

    return { graph, isLoading, error, refresh }
}

export interface WasmState {
    dictionary: DictionaryState
    search: SearchState
    trieGraph: TrieGraphState
}

export function useWasm(): WasmState {
    const dictionary = useWasmDictionary()
    const searchState = useSearch()
    const trieGraph = useTrieGraph()

    return { dictionary, search: searchState, trieGraph }
}
