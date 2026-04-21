pub mod automata;
pub mod dictionary;
pub mod edit_graph;
pub mod graph;
pub mod position;
pub mod state;
pub mod text_stream_writer;
pub mod trie;
pub mod walker;

use std::cell::RefCell;
use std::io::{Cursor, Write};

use wasm_bindgen::prelude::*;

use automata::Automata;
use dictionary::stream_dictionary_to_writer;
use graph::{SearchResult, TrieGraph};
use text_stream_writer::TrieStreamWriter;
use trie::{Trie, TrieBuilder};
use walker::walk;

thread_local! {
    static TRIE: RefCell<Option<Trie>> = RefCell::new(None);
}

#[wasm_bindgen]
pub fn init(bytes: &[u8]) -> Result<u32, JsValue> {
    if bytes.is_empty() {
        return Err(JsValue::from_str("empty dictionary"));
    }

    let mut builder = TrieBuilder::new();
    let word_count = {
        let mut writer = TrieStreamWriter::new(&mut builder);
        let count = stream_dictionary_to_writer(Cursor::new(bytes), &mut writer)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        writer
            .flush()
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        count
    };

    TRIE.with(|t| *t.borrow_mut() = Some(builder.finish()));

    Ok(word_count as u32)
}

#[wasm_bindgen]
pub fn reset() {
    TRIE.with(|t| *t.borrow_mut() = None);
}

#[wasm_bindgen]
pub fn search(word: &str, n: i32) -> Result<SearchResult, JsValue> {
    if n < 0 {
        return Err(JsValue::from_str("n must be >= 0"));
    }
    if word.is_empty() {
        return Err(JsValue::from_str("word must be non-empty"));
    }
    if !word.bytes().all(|b| b.is_ascii_lowercase()) {
        return Err(JsValue::from_str(
            "word must contain only ascii lowercase letters",
        ));
    }

    TRIE.with(|t| {
        let borrow = t.borrow();
        match borrow.as_ref() {
            None => Err(JsValue::from_str(
                "no dictionary loaded — call init() first",
            )),
            Some(trie) => {
                let automata = Automata::new(word.to_string(), n);
                Ok(walk(trie, &automata))
            }
        }
    })
}

#[wasm_bindgen(js_name = trieGraph)]
pub fn trie_graph() -> Result<TrieGraph, JsValue> {
    TRIE.with(|t| {
        let borrow = t.borrow();
        match borrow.as_ref() {
            None => Err(JsValue::from_str(
                "no dictionary loaded — call init() first",
            )),
            Some(trie) => Ok(trie.graph()),
        }
    })
}
