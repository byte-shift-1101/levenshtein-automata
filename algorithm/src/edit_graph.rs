use std::collections::{HashMap, HashSet, VecDeque};

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::graph::Op;

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct EditEdgeLabel {
    pub ch: char,
    pub op: Op,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct EditNode {
    pub id: u32,
    pub string: String,
    pub dist: u32,
    pub accepting: bool,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct EditEdge {
    pub from: u32,
    pub to: u32,
    pub labels: Vec<EditEdgeLabel>,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct EditGraph {
    pub query: String,
    pub max_edits: u32,
    pub nodes: Vec<EditNode>,
    pub edges: Vec<EditEdge>,
    pub truncated: bool,
}

const MAX_NODES: usize = 4000;

fn op_tag(op: Op) -> u8 {
    match op {
        Op::Match => 0,
        Op::Sub => 1,
        Op::Ins => 2,
        Op::Del => 3,
    }
}

fn op_clone(op: &Op) -> Op {
    match op {
        Op::Match => Op::Match,
        Op::Sub => Op::Sub,
        Op::Ins => Op::Ins,
        Op::Del => Op::Del,
    }
}

struct Builder {
    id_of: HashMap<String, u32>,
    strings: Vec<String>,
    dists: Vec<u32>,
    edge_idx: HashMap<(u32, u32), usize>,
    edges: Vec<(u32, u32, Vec<EditEdgeLabel>)>,
    edge_label_seen: HashSet<(u32, u32, char, u8)>,
    queue: VecDeque<u32>,
    truncated: bool,
}

impl Builder {
    fn new(query: String) -> Self {
        let mut b = Builder {
            id_of: HashMap::new(),
            strings: Vec::new(),
            dists: Vec::new(),
            edge_idx: HashMap::new(),
            edges: Vec::new(),
            edge_label_seen: HashSet::new(),
            queue: VecDeque::new(),
            truncated: false,
        };
        b.id_of.insert(query.clone(), 0);
        b.strings.push(query);
        b.dists.push(0);
        b.queue.push_back(0);
        b
    }

    fn get_or_create(&mut self, s: String, dist: u32) -> Option<u32> {
        if let Some(&id) = self.id_of.get(&s) {
            if self.dists[id as usize] > dist {
                self.dists[id as usize] = dist;
            }
            return Some(id);
        }
        if self.strings.len() >= MAX_NODES {
            self.truncated = true;
            return None;
        }
        let id = self.strings.len() as u32;
        self.id_of.insert(s.clone(), id);
        self.strings.push(s);
        self.dists.push(dist);
        self.queue.push_back(id);
        Some(id)
    }

    fn add_edge(&mut self, from: u32, to: u32, op: Op, ch: char) {
        let key = (from, to, ch, op_tag(op_clone(&op)));
        if !self.edge_label_seen.insert(key) {
            return;
        }
        let ekey = (from, to);
        let label = EditEdgeLabel {
            ch,
            op: op_clone(&op),
        };
        if let Some(&idx) = self.edge_idx.get(&ekey) {
            self.edges[idx].2.push(label);
        } else {
            let idx = self.edges.len();
            self.edge_idx.insert(ekey, idx);
            self.edges.push((from, to, vec![label]));
        }
    }
}

pub fn compute_edit_graph(query: &str, max_edits: u32, matches: &[String]) -> EditGraph {
    let mut alphabet_set: HashSet<char> = HashSet::new();
    for c in query.chars() {
        alphabet_set.insert(c);
    }
    for m in matches {
        for c in m.chars() {
            alphabet_set.insert(c);
        }
    }
    let mut alphabet: Vec<char> = alphabet_set.into_iter().collect();
    alphabet.sort_unstable();

    let accepting_set: HashSet<String> = matches.iter().cloned().collect();

    let mut b = Builder::new(query.to_string());

    while let Some(from_id) = b.queue.pop_front() {
        if b.truncated {
            break;
        }
        if b.strings.len() >= MAX_NODES {
            b.truncated = true;
            break;
        }
        let s = b.strings[from_id as usize].clone();
        let s_dist = b.dists[from_id as usize];
        let chars: Vec<char> = s.chars().collect();

        for &c in &chars {
            b.add_edge(from_id, from_id, Op::Match, c);
        }

        if s_dist >= max_edits {
            continue;
        }
        let new_dist = s_dist + 1;

        for i in 0..chars.len() {
            let ch = chars[i];
            let mut next = String::new();
            for (j, &c) in chars.iter().enumerate() {
                if j != i {
                    next.push(c);
                }
            }
            match b.get_or_create(next, new_dist) {
                Some(to_id) => b.add_edge(from_id, to_id, Op::Del, ch),
                None => break,
            }
        }
        if b.truncated {
            break;
        }

        'sub: for i in 0..chars.len() {
            for &c in &alphabet {
                if c == chars[i] {
                    continue;
                }
                let mut next = String::new();
                for (j, &cc) in chars.iter().enumerate() {
                    if j == i {
                        next.push(c);
                    } else {
                        next.push(cc);
                    }
                }
                match b.get_or_create(next, new_dist) {
                    Some(to_id) => b.add_edge(from_id, to_id, Op::Sub, c),
                    None => break 'sub,
                }
            }
        }
        if b.truncated {
            break;
        }

        'ins: for i in 0..=chars.len() {
            for &c in &alphabet {
                let mut next = String::new();
                for (j, &cc) in chars.iter().enumerate() {
                    if j == i {
                        next.push(c);
                    }
                    next.push(cc);
                }
                if i == chars.len() {
                    next.push(c);
                }
                match b.get_or_create(next, new_dist) {
                    Some(to_id) => b.add_edge(from_id, to_id, Op::Ins, c),
                    None => break 'ins,
                }
            }
        }
        if b.truncated {
            break;
        }
    }

    let n = b.strings.len();
    let mut rev_adj: Vec<Vec<u32>> = vec![Vec::new(); n];
    for (from, to, _) in &b.edges {
        if *from != *to {
            rev_adj[*to as usize].push(*from);
        }
    }

    let mut keep = vec![false; n];
    let mut bfs: VecDeque<u32> = VecDeque::new();
    for i in 0..n {
        if accepting_set.contains(&b.strings[i]) {
            keep[i] = true;
            bfs.push_back(i as u32);
        }
    }
    while let Some(x) = bfs.pop_front() {
        for &p in &rev_adj[x as usize] {
            if !keep[p as usize] {
                keep[p as usize] = true;
                bfs.push_back(p);
            }
        }
    }
    keep[0] = true;

    let mut new_id: Vec<i64> = vec![-1; n];
    let mut out_nodes: Vec<EditNode> = Vec::new();
    for i in 0..n {
        if !keep[i] {
            continue;
        }
        let nid = out_nodes.len() as u32;
        new_id[i] = nid as i64;
        out_nodes.push(EditNode {
            id: nid,
            string: b.strings[i].clone(),
            dist: b.dists[i],
            accepting: accepting_set.contains(&b.strings[i]),
        });
    }

    let mut out_edges: Vec<EditEdge> = Vec::new();
    for (from, to, labels) in b.edges {
        let fi = new_id[from as usize];
        let ti = new_id[to as usize];
        if fi < 0 || ti < 0 {
            continue;
        }
        out_edges.push(EditEdge {
            from: fi as u32,
            to: ti as u32,
            labels,
        });
    }

    EditGraph {
        query: query.to_string(),
        max_edits,
        nodes: out_nodes,
        edges: out_edges,
        truncated: b.truncated,
    }
}
