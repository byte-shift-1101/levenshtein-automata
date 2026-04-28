use algorithm::automata::Automata;
use algorithm::graph::Op;
use algorithm::trie::TrieBuilder;
use algorithm::walker::walk;
use std::collections::HashSet;

fn build_trie(words: &[&str]) -> algorithm::trie::Trie {
    let mut b = TrieBuilder::new();
    for &w in words {
        b.insert(w);
    }
    b.finish()
}

fn edit_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let (m, n) = (a.len(), b.len());
    let mut dp = vec![vec![0usize; n + 1]; m + 1];
    for i in 0..=m {
        dp[i][0] = i;
    }
    for j in 0..=n {
        dp[0][j] = j;
    }
    for i in 1..=m {
        for j in 1..=n {
            dp[i][j] = if a[i - 1] == b[j - 1] {
                dp[i - 1][j - 1]
            } else {
                1 + dp[i - 1][j - 1].min(dp[i - 1][j]).min(dp[i][j - 1])
            };
        }
    }
    dp[m][n]
}

fn brute_force(query: &str, n: i32, vocab: &[&str]) -> Vec<String> {
    let mut v: Vec<String> = vocab
        .iter()
        .filter(|&&w| edit_distance(query, w) <= n as usize)
        .map(|&w| w.to_string())
        .collect();
    v.sort();
    v
}

fn sorted_matches(query: &str, n: i32, vocab: &[&str]) -> Vec<String> {
    let trie = build_trie(vocab);
    let automata = Automata::new(query.to_string(), n);
    let mut got = walk(&trie, &automata).matches;
    got.sort();
    got
}

fn subsumes((i, e): (i32, i32), (j, f): (i32, i32)) -> bool {
    e < f && (j - i).abs() <= f - e
}

#[test]
fn exact_match_n0() {
    let vocab = &["apple", "apply", "ample", "apples", "apt"];
    assert_eq!(sorted_matches("apple", 0, vocab), vec!["apple"]);
}

#[test]
fn no_match_n0() {
    let vocab = &["apply", "ample", "apt"];
    assert_eq!(sorted_matches("apple", 0, vocab), Vec::<String>::new());
}

#[test]
fn fuzzy_n1_vs_brute_force() {
    let vocab = &["apple", "apply", "ample", "apples", "apt", "app", "able"];
    assert_eq!(
        sorted_matches("apple", 1, vocab),
        brute_force("apple", 1, vocab)
    );
}

#[test]
fn fuzzy_n2_vs_brute_force() {
    let vocab = &[
        "apple", "apply", "ample", "apples", "apt", "app", "able", "maple",
    ];
    assert_eq!(
        sorted_matches("apple", 2, vocab),
        brute_force("apple", 2, vocab)
    );
}

#[test]
fn deletion_at_end_n2() {
    let vocab = &["app", "apple"];
    assert_eq!(
        sorted_matches("apple", 2, vocab),
        brute_force("apple", 2, vocab)
    );
}

#[test]
fn skip_to_match_n2() {
    let vocab = &["able", "apple"];
    assert_eq!(
        sorted_matches("apple", 2, vocab),
        brute_force("apple", 2, vocab)
    );
}

#[test]
fn single_char_words() {
    let vocab = &["a", "b", "c"];
    assert_eq!(sorted_matches("a", 1, vocab), brute_force("a", 1, vocab));
}

#[test]
fn query_longer_than_all_words() {
    let vocab = &["a", "ab", "abc"];
    assert_eq!(
        sorted_matches("abcdef", 3, vocab),
        brute_force("abcdef", 3, vocab)
    );
}

#[test]
fn root_never_in_matches() {
    let vocab = &["a", "ab", "abc"];
    let trie = build_trie(vocab);
    let automata = Automata::new("abc".to_string(), 0);
    let result = walk(&trie, &automata);
    assert!(!result.matches.contains(&String::new()));
}

#[test]
fn transition_ids_in_range() {
    let vocab = &["cat", "car", "card", "care", "bat"];
    let trie = build_trie(vocab);
    let automata = Automata::new("cat".to_string(), 1);
    let result = walk(&trie, &automata);

    let state_count = result.states.len() as u32;
    for t in &result.transitions {
        assert!(
            t.from < state_count,
            "transition.from {} out of range",
            t.from
        );
        assert!(t.to < state_count, "transition.to {} out of range", t.to);
    }
}

#[test]
fn accepting_nodes_subset_of_visited() {
    let vocab = &["cat", "car", "card", "care", "bat"];
    let trie = build_trie(vocab);
    let automata = Automata::new("cat".to_string(), 1);
    let result = walk(&trie, &automata);

    let visited: HashSet<u32> = result.visited_trie_nodes.iter().copied().collect();
    for &id in &result.accepting_trie_nodes {
        assert!(
            visited.contains(&id),
            "accepting trie node {id} not in visited set"
        );
    }
}

#[test]
fn accepting_states_match_words() {
    let vocab = &["cat", "car", "card", "care", "bat"];
    let trie = build_trie(vocab);
    let automata = Automata::new("cat".to_string(), 1);
    let result = walk(&trie, &automata);

    let accepting_count = result.states.iter().filter(|s| s.accepting).count();
    assert!(accepting_count >= 1);
    assert!(!result.matches.is_empty());
}

#[test]
fn trie_graph_node_edge_counts() {
    let trie = build_trie(&["cat", "car"]);
    let g = trie.graph();
    assert_eq!(g.nodes.len(), 5, "expected 5 nodes (root+c+a+t+r)");
    assert_eq!(g.edges.len(), 4, "expected 4 edges");
    assert_eq!(g.root, 0);
}

#[test]
fn trie_graph_root_has_no_incoming_char() {
    let trie = build_trie(&["hello"]);
    let g = trie.graph();
    let root = g.nodes.iter().find(|n| n.id == g.root).unwrap();
    assert!(root.ch.is_none(), "root node should have no incoming char");
}

#[test]
fn trie_graph_non_root_has_incoming_char() {
    let trie = build_trie(&["hello"]);
    let g = trie.graph();
    for node in g.nodes.iter().filter(|n| n.id != g.root) {
        assert!(
            node.ch.is_some(),
            "non-root node {} missing incoming char",
            node.id
        );
    }
}

#[test]
fn start_state_has_depth_zero() {
    let trie = build_trie(&["cat", "car"]);
    let automata = Automata::new("cat".to_string(), 1);
    let result = walk(&trie, &automata);
    let start = result.states.iter().find(|s| s.id == 0).unwrap();
    assert_eq!(start.depth, 0, "start state must have depth 0");
}

#[test]
fn state_depths_are_non_decreasing_along_transitions() {
    let vocab = &["cat", "car", "bat"];
    let trie = build_trie(vocab);
    let automata = Automata::new("cat".to_string(), 1);
    let result = walk(&trie, &automata);

    let depth: std::collections::HashMap<u32, u32> =
        result.states.iter().map(|s| (s.id, s.depth)).collect();

    for t in &result.transitions {
        let d_from = depth[&t.from];
        let d_to = depth[&t.to];
        assert!(
            d_to >= d_from,
            "transition {} -> {} goes backwards in depth ({} -> {})",
            t.from,
            t.to,
            d_from,
            d_to
        );
    }
}

#[test]
fn all_transitions_have_valid_op() {
    let vocab = &["cat", "car", "bat", "cab"];
    let trie = build_trie(vocab);
    let automata = Automata::new("cat".to_string(), 2);
    let result = walk(&trie, &automata);
    for t in &result.transitions {
        let _ = match t.op {
            Op::Match | Op::Sub | Op::Ins | Op::Del => true,
        };
    }
}

#[test]
fn exact_match_transitions_are_match_op() {
    let trie = build_trie(&["abc"]);
    let automata = Automata::new("abc".to_string(), 0);
    let result = walk(&trie, &automata);
    assert!(!result.transitions.is_empty());
    for t in &result.transitions {
        assert!(
            matches!(t.op, Op::Match),
            "with n=0 all transitions must be Match, got non-match on char '{}'",
            t.ch
        );
    }
}

#[test]
fn mismatch_transitions_are_not_match_op() {
    let trie = build_trie(&["bbb"]);
    let automata = Automata::new("aaa".to_string(), 3);
    let result = walk(&trie, &automata);
    assert!(!result.transitions.is_empty());
    for t in &result.transitions {
        assert!(
            !matches!(t.op, Op::Match),
            "no char matches so no transition should be Match"
        );
    }
}

#[test]
fn automaton_states_are_reduced_like_reference_algorithm() {
    let vocab = &["abcd", "abxd", "axcd", "xbc", "abcde", "ab"];
    let trie = build_trie(vocab);
    let automata = Automata::new("abcd".to_string(), 2);
    let result = walk(&trie, &automata);

    for state in &result.states {
        for &p in &state.positions {
            for &q in &state.positions {
                if p == q {
                    continue;
                }
                assert!(
                    !subsumes(q, p),
                    "state {} contains subsumed position {:?} in {:?}",
                    state.id,
                    p,
                    state.positions
                );
            }
        }
    }
}

#[test]
fn accepting_states_include_matched_words() {
    let trie = build_trie(&["cat", "car", "dog"]);
    let automata = Automata::new("cat".to_string(), 1);
    let result = walk(&trie, &automata);
    let mut words: Vec<String> = result
        .states
        .iter()
        .flat_map(|state| state.matched_words.clone())
        .collect();
    words.sort();

    let mut matches = result.matches.clone();
    matches.sort();

    assert_eq!(words, matches);
}
