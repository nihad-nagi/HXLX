# HXLX - New Computing Paradigm

A semantic commit system using EM spectrum color-coding for better project visualization and workflow tracking.

## EMGits14 (For local use only)*

*: This system is designed for local repository use and visualizes workflow progression through color-coded commits.

This system provides **color-coded visual signals** for commits following an electromagnetic spectrum analogy. Each commit includes:

- **Color emoji** (semantic meaning)
- **Auto-incremented counter** (0001, 0002…)
- Works with **Scrum, Waterfall, or hybrid methodologies**
- Includes **special colors** for errors and solutions

## Color Mapping

### EM Spectrum Phases

| Square | Color | Emoji | Meaning / Phase | Typical Methodology Use |
|--------|-------|-------|----------------|------------------------|
| 1 | Red | 🟥 | Initialization / Planning / Kickoff | Scrum: Sprint Planning / Waterfall: Requirements |
| 2 | Orange | 🟧 | Requirements / Analysis | Scrum: Backlog refinement / Waterfall: Specs |
| 3 | Yellow | 🟨 | Design / Architecture / Refactor | Scrum: Story Design / Waterfall: Design |
| 4 | Green | 🟩 | Implementation / Features | Development / Coding |
| 5 | Blue | 🟦 | Testing / QA / Verification | QA / Test cases |
| 6 | Reddish / Dark Pink | 🟫 | Maintenance / Documentation / Knowledge | Retrospective fixes, Docs, Knowledge |
| 7 | Indigo | 🟪 | Deployment / Release / CI/CD | Release & Deployment |

### Special Cases

| Color | Emoji | Meaning |
|-------|-------|---------|
| Black | ⬛ | Errors / Bugs / Hotfix |
| White | ⬜ | Solutions / Patches / Cleanup |

> EM spectrum flow: 🟥 → 🟧 → 🟨 → 🟩 → 🟦 → 🟫 → 🟪

## Visual Representation

🟥 🟧 🟨 🟩 🟦 🟫 🟪
⬛ ⬜


- **Top row** → EM progression (normal workflow)
- **Bottom row** → special cases (errors/solutions)

## Usage Examples

### Commit Examples

🟥 0010: init project skeleton
🟧 0011: gather requirements
🟨 0012: design svg manager
🟩 0013: implement panzoom
🟦 0014: test double scroll
🟫 0015: update docs & maintenance
🟪 0016: release v0.1
⬛ 0017: fix critical crash
⬜ 0018: patch applied


### Git Configuration

```bash
# Initialize commit counter
git config commit.counter 0

# Helper alias: auto-increment counter
git config alias.nextcommit '!f() { \
  n=$(git config --get commit.counter || echo 0); \
  n=$((n+1)); \
  git config commit.counter "$n"; \
  printf "%04d" "$n"; \
}; f'

# Commit aliases by color / phase
git config alias.cinit '!f() { id=$(git nextcommit); git commit -m "🟥 $id: $*"; }; f'
git config alias.crequirements '!f() { id=$(git nextcommit); git commit -m "🟧 $id: $*"; }; f'
git config alias.cdesign '!f() { id=$(git nextcommit); git commit -m "🟨 $id: $*"; }; f'
git config alias.cfeat '!f() { id=$(git nextcommit); git commit -m "🟩 $id: $*"; }; f'
git config alias.ctest '!f() { id=$(git nextcommit); git commit -m "🟦 $id: $*"; }; f'
git config alias.cmaint '!f() { id=$(git nextcommit); git commit -m "🟫 $id: $*"; }; f'
git config alias.cdeploy '!f() { id=$(git nextcommit); git commit -m "🟪 $id: $*"; }; f'
git config alias.cerror '!f() { id=$(git nextcommit); git commit -m "⬛ $id: $*"; }; f'
git config alias.csolution '!f() { id=$(git nextcommit); git commit -m "⬜ $id: $*"; }; f'

# Optional: list all aliases
git config --get-regexp '^alias\.'

# Quick Reference Commands

# Make commits using aliases
git cinit "project initialization"
git crequirements "user authentication requirements"
git cfeat "add login functionality"
git cerror "fix null pointer exception"
git csolution "apply security patch"


