use crate::state::State;

pub struct Automata {
    word: String,
    chars: Vec<char>,
    n: i32,
}

impl Automata {
    pub fn new(word: String, max_edits: i32) -> Self {
        let chars = word.chars().collect();
        Self {
            word,
            chars,
            n: max_edits,
        }
    }

    pub fn query(&self) -> &str {
        &self.word
    }

    pub fn max_edits(&self) -> i32 {
        self.n
    }

    pub fn is_accept(&self, state: &State) -> bool {
        let w = self.chars.len() as i32;
        state.positions().any(|p| {
            let remaining = w - p.index();
            let budget = self.n - p.edits();
            remaining >= 0 && budget >= 0 && remaining <= budget
        })
    }

    pub fn transition(&self, state: &State, c: char) -> State {
        let mut next = State::new();
        let w = self.chars.len() as i32;

        for p in state.positions() {
            let i = p.index();
            let e = p.edits();
            let idx = match usize::try_from(i) {
                Ok(v) => v,
                Err(_) => continue,
            };

            if idx >= self.chars.len() {
                if e < self.n {
                    next.insert(w, e + 1);
                }
                continue;
            }

            if e == self.n {
                if self.chars[idx] == c {
                    next.insert(i + 1, e);
                }
                continue;
            }

            let k = ((self.n - e + 1) as usize).min(self.chars.len() - idx);

            let j = self.chars[idx..idx + k]
                .iter()
                .position(|&x| x == c)
                .map(|pos| pos + 1);

            match j {
                Some(1) => {
                    next.insert(i + 1, e);
                }
                Some(j) => {
                    next.insert(i + j as i32, e + j as i32 - 1);
                    next.insert(i, e + 1);
                    next.insert(i + 1, e + 1);
                }
                None => {
                    next.insert(i, e + 1);
                    next.insert(i + 1, e + 1);
                }
            }
        }

        self.normalize(next)
    }

    fn normalize(&self, state: State) -> State {
        let positions: Vec<(i32, i32)> = state
            .positions()
            .filter(|p| p.edits() <= self.n)
            .map(|p| (p.index(), p.edits()))
            .collect();
        let mut res = State::new();

        for &(i, e) in &positions {
            let subsumed = positions
                .iter()
                .any(|&(j, f)| (i, e) != (j, f) && subsumes((j, f), (i, e)));
            if !subsumed {
                res.insert(i, e);
            }
        }
        res
    }
}

fn subsumes((i, e): (i32, i32), (j, f): (i32, i32)) -> bool {
    e < f && (j - i).abs() <= f - e
}
