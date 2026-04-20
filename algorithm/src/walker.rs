use std::collections::{HashMap, HashSet};

use crate::automata::Automata;
use crate::graph::{AutomatonEdge, AutomatonNode, SearchResult};
use crate::state::State;
use crate::trie::Trie;

const MAX_STATES: usize = 500_000;

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

    let mut stack: Vec<(&Trie, String, State, Option<u32>, Option<char>)> =
        vec![(trie, String::new(), initial, None, None)];

    while let Some((node, prefix, state, parent_id, incoming_ch)) = stack.pop() {
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
                });
                state_map.insert(state_key, id);
                id
            }
        };

        if let (Some(from), Some(ch)) = (parent_id, incoming_ch) {
            transitions.push(AutomatonEdge {
                from,
                to: state_id,
                ch,
                trie_node: node.id(),
            });
        }

        if node.is_end() && automata.is_accept(&state) {
            matches.push(prefix.clone());
            accepting_set.insert(node.id());
        }

        for (ch, child) in node.children() {
            let next_state = automata.transition(&state, ch);
            if !next_state.is_empty() {
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
                ));
            }
        }
    }

    let mut visited_trie_nodes: Vec<u32> = visited.into_iter().collect();
    visited_trie_nodes.sort_unstable();

    let mut accepting_trie_nodes: Vec<u32> = accepting_set.into_iter().collect();
    accepting_trie_nodes.sort_unstable();

    SearchResult {
        query: automata.query().to_string(),
        max_edits: automata.max_edits(),
        matches,
        states,
        transitions,
        visited_trie_nodes,
        accepting_trie_nodes,
        truncated,
    }
}
