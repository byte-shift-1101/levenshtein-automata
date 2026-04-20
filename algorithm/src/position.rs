use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
pub struct Position {
    index: i32,
    edits: i32,
}

impl Position {
    pub fn new(i: i32, e: i32) -> Self {
        Self { index: i, edits: e }
    }

    pub fn index(&self) -> i32 {
        self.index
    }

    pub fn edits(&self) -> i32 {
        self.edits
    }
}
