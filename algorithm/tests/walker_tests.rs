use algorithm::automata::Automata;
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
