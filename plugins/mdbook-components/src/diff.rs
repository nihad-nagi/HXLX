// Cargo.toml
[dependencies]
similar = { version = "2.5", features = ["text"] }  # Fast diff algorithm
strsim = "0.10"  # String similarity
fancy-regex = "0.12"  # More performant regex with backtracking limits

// src/diff.rs
use similar::{ChangeTag, TextDiff};
use strsim::normalized_levenshtein;

pub struct EfficientPatcher {
    pub chunk_size: usize,      // Process in chunks
    pub similarity_threshold: f64, // 0.9 = 90% similar
}

impl EfficientPatcher {
    pub fn should_patch(&self, old: &str, new: &str) -> PatchDecision {
        // Fast length check
        if old.len() > 100_000 || new.len() > 100_000 {
            return PatchDecision::FullReplace; // Too big for diffing
        }

        // Quick equality
        if old == new {
            return PatchDecision::NoChange;
        }

        // Fast similarity check using strsim
        let similarity = normalized_levenshtein(old, new);
        if similarity > self.similarity_threshold {
            // Similar enough for targeted patching
            PatchDecision::TargetedPatch(similarity)
        } else if similarity < 0.3 {
            // Too different, full replace
            PatchDecision::FullReplace
        } else {
            // Use chunked diff
            self.chunked_diff(old, new)
        }
    }

    fn chunked_diff(&self, old: &str, new: &str) -> PatchDecision {
        let diff = TextDiff::from_lines(old, new);

        // Count changes intelligently
        let total_lines = diff.new_len().max(diff.old_len());
        let changed_lines = diff.ops().iter()
            .filter(|op| !op.is_equal())
            .count();

        let change_ratio = changed_lines as f32 / total_lines as f32;

        if change_ratio > 0.5 {
            PatchDecision::FullReplace
        } else {
            PatchDecision::TargetedPatch(1.0 - change_ratio as f64)
        }
    }

    pub fn generate_patches(&self, old: &str, new: &str) -> Vec<Patch> {
        let diff = TextDiff::configure()
            .algorithm(similar::Algorithm::Myers)
            .diff_sequences(similar::Algorithm::Myers)
            .diff_chars(old, new);

        diff.ops()
            .iter()
            .filter(|op| !op.is_equal())
            .map(|op| {
                let range = op.as_tag().unwrap();
                match range.tag() {
                    ChangeTag::Delete => Patch::Delete { range: range.old_range() },
                    ChangeTag::Insert => Patch::Insert {
                        position: range.new_range().start,
                        text: new[range.new_range()].to_string()
                    },
                    ChangeTag::Replace => Patch::Replace {
                        range: range.old_range(),
                        text: new[range.new_range()].to_string()
                    },
                }
            })
            .collect()
    }
}
