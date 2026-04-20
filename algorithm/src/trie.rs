use std::array;

use crate::graph::{TrieEdge, TrieGraph, TrieNode};

pub struct Trie {
    id: u32,
    child: [Option<Box<Trie>>; 26],
    is_end: bool,
}

pub struct TrieBuilder {
    pub root: Trie,
    next_id: u32,
}

impl Default for TrieBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl TrieBuilder {
    pub fn new() -> Self {
        Self {
            root: Trie {
                id: 0,
                child: array::from_fn(|_| None),
                is_end: false,
            },
            next_id: 1,
        }
    }

    pub fn insert(&mut self, word: &str) {
        self.root.insert_impl(word.as_bytes(), &mut self.next_id);
    }

    pub fn finish(self) -> Trie {
        self.root
    }
}

impl Trie {
    fn insert_impl(&mut self, bytes: &[u8], counter: &mut u32) {
        if bytes.is_empty() {
            self.is_end = true;
            return;
        }
        let idx = (bytes[0] - b'a') as usize;
        if self.child[idx].is_none() {
            let id = *counter;
            *counter += 1;
            self.child[idx] = Some(Box::new(Trie {
                id,
                child: array::from_fn(|_| None),
                is_end: false,
            }));
        }
        self.child[idx]
            .as_mut()
            .unwrap()
            .insert_impl(&bytes[1..], counter);
    }

    pub fn id(&self) -> u32 {
        self.id
    }

    pub fn is_end(&self) -> bool {
        self.is_end
    }

    pub fn children(&self) -> impl Iterator<Item = (char, &Trie)> {
        self.child.iter().enumerate().filter_map(|(idx, child)| {
            child
                .as_deref()
                .map(|node| ((b'a' + idx as u8) as char, node))
        })
    }

    fn find_node(&self, word: &str) -> Option<&Trie> {
        let mut node = self;
        for c in word.bytes() {
            let idx = (c - b'a') as usize;
            match &node.child[idx] {
                Some(child) => node = child,
                None => return None,
            }
        }
        Some(node)
    }

    pub fn exact_match(&self, word: &str) -> bool {
        self.find_node(word).map_or(false, |n| n.is_end)
    }

    pub fn has_prefix(&self, prefix: &str) -> bool {
        self.find_node(prefix).is_some()
    }

    pub fn graph(&self) -> TrieGraph {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        let mut stack: Vec<(&Trie, u32, Option<char>)> = vec![(self, 0, None)];

        while let Some((node, depth, incoming_ch)) = stack.pop() {
            nodes.push(TrieNode {
                id: node.id,
                ch: incoming_ch,
                is_end: node.is_end,
                depth,
            });
            for (ch, child) in node.children() {
                edges.push(TrieEdge {
                    from: node.id,
                    to: child.id,
                    ch,
                });
                stack.push((child, depth + 1, Some(ch)));
            }
        }

        TrieGraph {
            nodes,
            edges,
            root: self.id,
        }
    }
}
