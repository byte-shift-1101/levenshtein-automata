use std::collections::{HashMap, HashSet, VecDeque};

use algorithm::automata::Automata;
use algorithm::edit_graph::{EditGraph, compute_edit_graph};
use algorithm::graph::Op;
use algorithm::trie::TrieBuilder;
use algorithm::walker::walk;

fn build_trie(words: &[&str]) -> algorithm::trie::Trie {
    let mut b = TrieBuilder::new();
    for &w in words {
        b.insert(w);
    }
    b.finish()
}

fn to_strings(xs: &[&str]) -> Vec<String> {
    xs.iter().map(|s| s.to_string()).collect()
}

fn id_of(g: &EditGraph, s: &str) -> Option<u32> {
    g.nodes.iter().find(|n| n.string == s).map(|n| n.id)
}

fn forward_reachable(g: &EditGraph, from: u32) -> HashSet<u32> {
    let mut adj: HashMap<u32, Vec<u32>> = HashMap::new();
    for e in &g.edges {
        if e.from != e.to {
            adj.entry(e.from).or_default().push(e.to);
        }
    }
    let mut seen: HashSet<u32> = HashSet::new();
    let mut q: VecDeque<u32> = VecDeque::new();
    seen.insert(from);
    q.push_back(from);
    while let Some(x) = q.pop_front() {
        for &y in adj.get(&x).unwrap_or(&Vec::new()) {
            if seen.insert(y) {
                q.push_back(y);
            }
        }
    }
    seen
}

#[test]
fn root_is_query_id_zero_dist_zero() {
    let g = compute_edit_graph("hell", 1, &to_strings(&["hell", "hello"]));
    let root = g.nodes.iter().find(|n| n.id == 0).unwrap();
    assert_eq!(root.string, "hell");
    assert_eq!(root.dist, 0);
    assert_eq!(g.query, "hell");
    assert_eq!(g.max_edits, 1);
}

#[test]
fn empty_matches_keeps_only_root() {
    let g = compute_edit_graph("abc", 2, &[]);
    assert_eq!(g.nodes.len(), 1);
    assert_eq!(g.nodes[0].string, "abc");
    assert_eq!(g.nodes[0].id, 0);
    assert!(g.edges.iter().all(|e| e.from == e.to));
}

#[test]
fn all_dictionary_matches_are_accepting_nodes() {
    let matches = to_strings(&["hell", "hello", "help", "ell"]);
    let g = compute_edit_graph("hell", 1, &matches);
    for m in &matches {
        let n = g.nodes.iter().find(|n| &n.string == m);
        assert!(n.is_some(), "match {m} missing from edit graph");
        assert!(n.unwrap().accepting, "match {m} not marked accepting");
    }
}

#[test]
fn accepting_nodes_are_subset_of_matches() {
    let matches = to_strings(&["hell", "hello"]);
    let match_set: HashSet<String> = matches.iter().cloned().collect();
    let g = compute_edit_graph("hell", 1, &matches);
    for n in &g.nodes {
        if n.accepting {
            assert!(
                match_set.contains(&n.string),
                "accepting node {} not in matches list",
                n.string
            );
        }
    }
}

#[test]
fn every_kept_node_reaches_an_accepting_node() {
    let matches = to_strings(&["hello", "help"]);
    let g = compute_edit_graph("hell", 2, &matches);

    let mut rev: HashMap<u32, Vec<u32>> = HashMap::new();
    for e in &g.edges {
        if e.from != e.to {
            rev.entry(e.to).or_default().push(e.from);
        }
    }
    let mut good: HashSet<u32> = HashSet::new();
    let mut q: VecDeque<u32> = VecDeque::new();
    for n in &g.nodes {
        if n.accepting {
            good.insert(n.id);
            q.push_back(n.id);
        }
    }
    while let Some(x) = q.pop_front() {
        for &p in rev.get(&x).unwrap_or(&Vec::new()) {
            if good.insert(p) {
                q.push_back(p);
            }
        }
    }
    for n in &g.nodes {
        assert!(
            good.contains(&n.id) || n.id == 0,
            "node {} ({}) kept but cannot reach an accepting node",
            n.id,
            n.string
        );
    }
}

#[test]
fn every_non_root_node_forward_reachable_from_root() {
    let g = compute_edit_graph("hell", 2, &to_strings(&["hello", "help", "ell"]));
    let reach = forward_reachable(&g, 0);
    for n in &g.nodes {
        assert!(
            reach.contains(&n.id),
            "node {} ({}) not forward reachable from root",
            n.id,
            n.string
        );
    }
}

#[test]
fn edge_cost_invariant_non_self_loops() {
    let g = compute_edit_graph("hell", 2, &to_strings(&["hello", "help", "ell"]));
    let dist: HashMap<u32, u32> = g.nodes.iter().map(|n| (n.id, n.dist)).collect();
    for e in &g.edges {
        if e.from == e.to {
            continue;
        }
        let df = dist[&e.from];
        let dt = dist[&e.to];
        assert!(
            dt <= df + 1,
            "edge {}->{} violates cost invariant (dist {} -> {})",
            e.from,
            e.to,
            df,
            dt
        );
    }
}

#[test]
fn every_node_has_match_self_loops_for_each_char() {
    let g = compute_edit_graph("hell", 1, &to_strings(&["hello", "help"]));
    for n in &g.nodes {
        if n.string.is_empty() {
            continue;
        }
        let chars: HashSet<char> = n.string.chars().collect();
        let self_edge = g.edges.iter().find(|e| e.from == n.id && e.to == n.id);
        assert!(
            self_edge.is_some(),
            "node {} ({}) missing self-loop edge",
            n.id,
            n.string
        );
        let e = self_edge.unwrap();
        let match_chars: HashSet<char> = e
            .labels
            .iter()
            .filter(|l| matches!(l.op, Op::Match))
            .map(|l| l.ch)
            .collect();
        for c in chars {
            assert!(
                match_chars.contains(&c),
                "node {} ({}) missing match self-loop for '{}'",
                n.id,
                n.string,
                c
            );
        }
    }
}

#[test]
fn max_edits_zero_no_nonzero_dist_nodes() {
    let g = compute_edit_graph("abc", 0, &to_strings(&["abc", "abd"]));
    for n in &g.nodes {
        assert_eq!(
            n.dist, 0,
            "with max_edits=0, found node {} at dist {}",
            n.string, n.dist
        );
    }
    let abd = id_of(&g, "abd");
    assert!(
        abd.is_none(),
        "abd should not appear with max_edits=0 (requires 1 sub)"
    );
}

#[test]
fn deletion_reaches_shorter_string() {
    let g = compute_edit_graph("hell", 1, &to_strings(&["ell", "hel"]));
    let root = 0;
    let ell = id_of(&g, "ell").expect("ell must be kept (accepting)");
    let hel = id_of(&g, "hel").expect("hel must be kept (accepting)");

    let has_del_to_ell = g.edges.iter().any(|e| {
        e.from == root
            && e.to == ell
            && e.labels
                .iter()
                .any(|l| matches!(l.op, Op::Del) && l.ch == 'h')
    });
    assert!(has_del_to_ell, "missing del 'h' edge from hell to ell");

    let has_del_to_hel = g.edges.iter().any(|e| {
        e.from == root
            && e.to == hel
            && e.labels
                .iter()
                .any(|l| matches!(l.op, Op::Del) && l.ch == 'l')
    });
    assert!(has_del_to_hel, "missing del 'l' edge from hell to hel");
}

#[test]
fn insertion_reaches_longer_string() {
    let g = compute_edit_graph("hell", 1, &to_strings(&["hello"]));
    let hello = id_of(&g, "hello").expect("hello must be kept");
    let has_ins = g.edges.iter().any(|e| {
        e.from == 0
            && e.to == hello
            && e.labels
                .iter()
                .any(|l| matches!(l.op, Op::Ins) && l.ch == 'o')
    });
    assert!(has_ins, "missing ins 'o' edge from hell to hello");
}

#[test]
fn substitution_label_present() {
    let g = compute_edit_graph("hell", 1, &to_strings(&["help"]));
    let help = id_of(&g, "help").expect("help must be kept");
    let has_sub = g.edges.iter().any(|e| {
        e.from == 0
            && e.to == help
            && e.labels
                .iter()
                .any(|l| matches!(l.op, Op::Sub) && l.ch == 'p')
    });
    assert!(has_sub, "missing sub 'p' edge from hell to help");
}

#[test]
fn edge_alphabet_bounded_by_query_and_matches() {
    let query = "hell";
    let matches = to_strings(&["hello", "help"]);
    let mut allowed: HashSet<char> = HashSet::new();
    for c in query.chars() {
        allowed.insert(c);
    }
    for m in &matches {
        for c in m.chars() {
            allowed.insert(c);
        }
    }
    let g = compute_edit_graph(query, 2, &matches);
    for e in &g.edges {
        for lab in &e.labels {
            assert!(
                allowed.contains(&lab.ch),
                "edge label char '{}' not in alphabet",
                lab.ch
            );
        }
    }
}

#[test]
fn multi_label_edges_have_unique_op_ch_pairs() {
    let g = compute_edit_graph("ab", 2, &to_strings(&["ab", "ba", "aa"]));
    for e in &g.edges {
        let mut seen: HashSet<(u8, char)> = HashSet::new();
        for lab in &e.labels {
            let tag = match lab.op {
                Op::Match => 0,
                Op::Sub => 1,
                Op::Ins => 2,
                Op::Del => 3,
            };
            assert!(
                seen.insert((tag, lab.ch)),
                "duplicate (op, ch) label on edge {}->{}",
                e.from,
                e.to
            );
        }
    }
}

#[test]
fn node_ids_are_dense_and_unique() {
    let g = compute_edit_graph("hell", 2, &to_strings(&["hell", "hello", "help", "ell"]));
    let mut ids: Vec<u32> = g.nodes.iter().map(|n| n.id).collect();
    ids.sort_unstable();
    for (idx, id) in ids.iter().enumerate() {
        assert_eq!(*id as usize, idx, "node ids must be dense 0..n");
    }
}

#[test]
fn edge_endpoints_are_valid_node_ids() {
    let g = compute_edit_graph("hell", 2, &to_strings(&["hello", "help"]));
    let n = g.nodes.len() as u32;
    for e in &g.edges {
        assert!(e.from < n, "edge.from {} out of range", e.from);
        assert!(e.to < n, "edge.to {} out of range", e.to);
    }
}

#[test]
fn truncation_bounded_graph_not_truncated() {
    let g = compute_edit_graph("hi", 1, &to_strings(&["hi", "ho"]));
    assert!(!g.truncated, "small graph should not be truncated");
}

#[test]
fn walker_populates_edit_graph_query_and_max_edits() {
    let trie = build_trie(&["hello", "help", "hell"]);
    let automata = Automata::new("hell".to_string(), 1);
    let result = walk(&trie, &automata);
    assert_eq!(result.edit_graph.query, "hell");
    assert_eq!(result.edit_graph.max_edits, 1);
}

#[test]
fn walker_edit_graph_contains_all_walker_matches() {
    let trie = build_trie(&["hello", "help", "hell", "ell", "fell"]);
    let automata = Automata::new("hell".to_string(), 1);
    let result = walk(&trie, &automata);
    let accepting_strings: HashSet<String> = result
        .edit_graph
        .nodes
        .iter()
        .filter(|n| n.accepting)
        .map(|n| n.string.clone())
        .collect();
    for m in &result.matches {
        assert!(
            accepting_strings.contains(m),
            "walker match {m} not in edit_graph accepting nodes"
        );
    }
}
