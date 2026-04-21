use std::collections::{HashMap, HashSet};

use crate::automata::Automata;
use crate::edit_graph::compute_edit_graph;
use crate::graph::{AutomatonEdge, AutomatonNode, Op, SearchResult};
use crate::state::State;
use crate::trie::Trie;

const MAX_STATES: usize = 500_000;

fn classify_op(from: &State, to: &State) -> Op {
    let min_e_from = from.positions().map(|p| p.edits()).min().unwrap_or(0);
    let min_e_to = to.positions().map(|p| p.edits()).min().unwrap_or(0);
    let max_i_from = from.positions().map(|p| p.index()).max().unwrap_or(0);
    let max_i_to = to.positions().map(|p| p.index()).max().unwrap_or(0);

    if min_e_to <= min_e_from {
        Op::Match
    } else if max_i_to > max_i_from {
        Op::Sub
    } else {
        Op::Ins
    }
}

pub fn walk(trie: &Trie, automata: &Automata) -> SearchResult {
    let mut initial = State::new();
    initial.insert(0, 0);

    let mut states: Vec<AutomatonNode> = Vec::new();
    let mut transitions: Vec<AutomatonEdge> = Vec::new();
    let mut visited: HashSet<u32> = HashSet::new();
    let mut accepting_set: HashSet<u32> = HashSet::new();
    let mut matches: Vec<String> = Vec::new();
    let mut truncated = false;

    let mut state_map: HashMap<(u32, Vec<(i32, i32)>), u32> = HashMap::new();

    let mut stack: Vec<(&Trie, String, State, Option<u32>, Option<char>, Option<Op>)> =
        vec![(trie, String::new(), initial, None, None, None)];

    while let Some((node, prefix, state, parent_id, incoming_ch, incoming_op)) = stack.pop() {
        if states.len() >= MAX_STATES {
            truncated = true;
            break;
        }

        visited.insert(node.id());

        let sorted_pos = state.sorted();
        let state_key = (node.id(), sorted_pos.clone());

        let state_id = match state_map.get(&state_key) {
            Some(&id) => id,
            None => {
                let id = states.len() as u32;
                let accepting = automata.is_accept(&state);
                states.push(AutomatonNode {
                    id,
                    positions: sorted_pos.clone(),
                    accepting,
                    depth: prefix.len() as u32,
                });
                state_map.insert(state_key, id);
                id
            }
        };

        if let (Some(from), Some(ch), Some(op)) = (parent_id, incoming_ch, incoming_op) {
            transitions.push(AutomatonEdge {
                from,
                to: state_id,
                ch,
                trie_node: node.id(),
                op,
            });
        }

        if node.is_end() && automata.is_accept(&state) {
            matches.push(prefix.clone());
            accepting_set.insert(node.id());
        }

        for (ch, child) in node.children() {
            let next_state = automata.transition(&state, ch);
            if !next_state.is_empty() {
                let op = classify_op(&state, &next_state);
                stack.push((
                    child,
                    {
                        let mut p = prefix.clone();
                        p.push(ch);
                        p
                    },
                    next_state,
                    Some(state_id),
                    Some(ch),
                    Some(op),
                ));
            }
        }
    }

    let mut visited_trie_nodes: Vec<u32> = visited.into_iter().collect();
    visited_trie_nodes.sort_unstable();

    let mut accepting_trie_nodes: Vec<u32> = accepting_set.into_iter().collect();
    accepting_trie_nodes.sort_unstable();

    let query_str = automata.query().to_string();
    let max_edits = automata.max_edits();
    let edit_graph = compute_edit_graph(&query_str, max_edits.max(0) as u32, &matches);

    SearchResult {
        query: query_str,
        max_edits,
        matches,
        states,
        transitions,
        visited_trie_nodes,
        accepting_trie_nodes,
        truncated,
        edit_graph,
    }
}
