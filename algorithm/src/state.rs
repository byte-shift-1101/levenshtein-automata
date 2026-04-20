use crate::position::Position;
use std::collections::HashSet;

pub struct State {
    positions: HashSet<Position>,
}

impl State {
    pub fn new() -> Self {
        Self {
            positions: HashSet::new(),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.positions.is_empty()
    }

    pub fn insert(&mut self, i: i32, e: i32) -> bool {
        self.positions.insert(Position::new(i, e))
    }

    pub fn positions(&self) -> impl Iterator<Item = &Position> {
        self.positions.iter()
    }

    pub fn sorted(&self) -> Vec<(i32, i32)> {
        let mut v: Vec<(i32, i32)> = self
            .positions
            .iter()
            .map(|p| (p.index(), p.edits()))
            .collect();
        v.sort_unstable();
        v
    }
}
