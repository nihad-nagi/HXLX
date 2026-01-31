.PHONY: all build install init clean test dev-test help

# --------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------

# Default book directory (relative to this plugin directory)
BOOK_DIR ?= ../..

# Binary name
BIN := mdbook-mermaid-panzoom

# --------------------------------------------------------------------
# Default target
# --------------------------------------------------------------------

all: clean build install

# --------------------------------------------------------------------
# Build the preprocessor (no install)
# --------------------------------------------------------------------

build:
	@echo "🔨 Building $(BIN)..."
	cargo build --release

# --------------------------------------------------------------------
# Install binary globally (does NOT touch any book)
# --------------------------------------------------------------------

install:
	@echo "📦 Installing $(BIN) globally..."
	cargo install --force --path .

# --------------------------------------------------------------------
# Initialize assets + config in a book directory
# (assumes binary is already installed or in PATH)
# --------------------------------------------------------------------

init:
	@echo "🚀 Initializing mdBook assets in: $(BOOK_DIR)"
	$(BIN) init --dir "$(BOOK_DIR)"

# Backward-compatible alias (semantic, not required)
update: init

# --------------------------------------------------------------------
# Development helpers
# --------------------------------------------------------------------

# Run against a sample book (binary semantics preserved)
dev-test: build
	@echo "🔍 Dev test with sample book..."
	cargo install --force --path . > /dev/null
	$(BIN) init --dir examples/sample-book
	cd examples/sample-book && mdbook build

# --------------------------------------------------------------------
# Maintenance
# --------------------------------------------------------------------

clean:
	@echo "🧹 Cleaning built artifacts..."
	cargo clean

test:
	@echo "🧪 Running tests..."
	cargo test

# --------------------------------------------------------------------
# Help
# --------------------------------------------------------------------

help:
	@echo ""
	@echo "mdbook-mermaid-panzoom Makefile"
	@echo "--------------------------------"
	@echo ""
	@echo "Targets:"
	@echo "  make build        Build the preprocessor (no install)"
	@echo "  make install      Install the binary globally"
	@echo "  make init         Initialize assets + config in a book"
	@echo "  make update       Alias for 'make init'"
	@echo "  make dev-test     Build, install, and test against sample book"
	@echo "  make clean        Clean build artifacts"
	@echo "  make test         Run unit tests"
	@echo ""
	@echo "Variables:"
	@echo "  BOOK_DIR=path     Book root directory (default: ../..)"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make install"
	@echo "  make init BOOK_DIR=/path/to/book"
	@echo "  make dev-test"
	@echo ""
