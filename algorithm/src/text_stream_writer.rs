use std::io::Write;

use crate::trie::TrieBuilder;

pub struct TrieStreamWriter<'a> {
    builder: &'a mut TrieBuilder,
    buffer: Vec<u8>,
}

impl<'a> TrieStreamWriter<'a> {
    pub fn new(builder: &'a mut TrieBuilder) -> Self {
        Self {
            builder,
            buffer: Vec::new(),
        }
    }

    fn drain_complete_lines(&mut self) {
        while let Some(pos) = self.buffer.iter().position(|&b| b == b'\n') {
            let mut line = self.buffer.drain(..=pos).collect::<Vec<u8>>();
            if matches!(line.last(), Some(b'\n')) {
                line.pop();
            }
            if matches!(line.last(), Some(b'\r')) {
                line.pop();
            }
            if let Ok(word) = String::from_utf8(line) {
                if !word.is_empty() && word.bytes().all(|b| b.is_ascii_lowercase()) {
                    self.builder.insert(&word);
                }
            }
        }
    }
}

impl Write for TrieStreamWriter<'_> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.buffer.extend_from_slice(buf);
        self.drain_complete_lines();
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        if !self.buffer.is_empty() {
            let mut line = std::mem::take(&mut self.buffer);
            if matches!(line.last(), Some(b'\r')) {
                line.pop();
            }
            if let Ok(word) = String::from_utf8(line) {
                if !word.is_empty() && word.bytes().all(|b| b.is_ascii_lowercase()) {
                    self.builder.insert(&word);
                }
            }
        }
        Ok(())
    }
}
