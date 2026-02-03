# Initialize commit counter
git config commit.counter 289

# Helper alias: auto-increment counter
git config alias.nextcommit '!f() { \
  n=$(git config --get commit.counter || echo 0); \
  n=$((n+1)); \
  git config commit.counter "$n"; \
  printf "%04d" "$n"; \
}; f'

# Commit aliases by color / phase
git config alias.cinit '!f() { id=$(git nextcommit); git commit -m "🟥 $id: $*"; }; f'
git config alias.creq '!f() { id=$(git nextcommit); git commit -m "🟧 $id: $*"; }; f'
git config alias.cdesign '!f() { id=$(git nextcommit); git commit -m "🟨 $id: $*"; }; f'
git config alias.cfeat '!f() { id=$(git nextcommit); git commit -m "🟩 $id: $*"; }; f'
git config alias.ctest '!f() { id=$(git nextcommit); git commit -m "🟦 $id: $*"; }; f'
git config alias.cmaint '!f() { id=$(git nextcommit); git commit -m "🟫 $id: $*"; }; f'
git config alias.cdeploy '!f() { id=$(git nextcommit); git commit -m "🟪 $id: $*"; }; f'
git config alias.cerror '!f() { id=$(git nextcommit); git commit -m "⬛ $id: $*"; }; f'
git config alias.csol '!f() { id=$(git nextcommit); git commit -m "⬜ $id: $*"; }; f'

# Optional: list all aliases
git config --get-regexp '^alias\.'
