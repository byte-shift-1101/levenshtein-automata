use algorithm::automata::Automata;
use algorithm::dictionary::stream_dictionary_to_writer;
use algorithm::text_stream_writer::TrieStreamWriter;
use algorithm::trie::TrieBuilder;
use algorithm::walker::walk;
use std::fs::File;
use std::io::{BufReader, Write};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();

    let filepath = args.get(1).map(String::as_str).unwrap_or("data/words.json");
    let query = args.get(2).map(String::as_str).unwrap_or("apple");
    let max_edits: i32 = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(1);

    let mut builder = TrieBuilder::new();
    let word_count = {
        let input = File::open(filepath)?;
        let mut writer = TrieStreamWriter::new(&mut builder);
        let count = stream_dictionary_to_writer(BufReader::new(input), &mut writer)?;
        writer.flush()?;
        count
    };
    let trie = builder.finish();

    println!("loaded {word_count} words from {filepath}");

    let automata = Automata::new(query.to_string(), max_edits);
    let result = walk(&trie, &automata);

    println!("query={query:?}  max_edits={max_edits}");
    println!("matches: {}", result.matches.len());
    println!(
        "sample:  {:?}",
        result.matches.iter().take(20).collect::<Vec<_>>()
    );
    println!("trie nodes visited:  {}", result.visited_trie_nodes.len());
    println!("automaton states:    {}", result.states.len());
    println!("automaton edges:     {}", result.transitions.len());
    println!("truncated:           {}", result.truncated);

    Ok(())
}
