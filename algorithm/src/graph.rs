use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrieNode {
    pub id: u32,
    pub ch: Option<char>,
    pub is_end: bool,
    pub depth: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrieEdge {
    pub from: u32,
    pub to: u32,
    pub ch: char,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrieGraph {
    pub nodes: Vec<TrieNode>,
    pub edges: Vec<TrieEdge>,
    pub root: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomatonNode {
    pub id: u32,
    pub positions: Vec<(i32, i32)>,
    pub accepting: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomatonEdge {
    pub from: u32,
    pub to: u32,
    pub ch: char,
    pub trie_node: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub query: String,
    pub max_edits: i32,
    pub matches: Vec<String>,
    pub states: Vec<AutomatonNode>,
    pub transitions: Vec<AutomatonEdge>,
    pub visited_trie_nodes: Vec<u32>,
    pub accepting_trie_nodes: Vec<u32>,
    pub truncated: bool,
}
