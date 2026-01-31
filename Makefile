# Variables
# BOOK_DIR ?= .
# BUILD_DIR ?= $(BOOK_DIR)/book
MDBOOK ?= mdbook

# Default target
.PHONY: all
all: clean build serve

# Clean generated files
.PHONY: clean
clean:
	@echo "Cleaning generated files..."
	# $(MDBOOK) clean $(BOOK_DIR)
	$(MDBOOK) clean
# Build the book
.PHONY: build
build:
	@echo "Building the book..."
	$(MDBOOK) build
	@echo "Book built in $(BOOK_DIR)"

# Serve the book locally
.PHONY: serve
serve:
	@echo "Starting mdBook server..."
	$(MDBOOK) serve $(BOOK_DIR)

# # Watch and serve with auto-reload
# .PHONY: watch
# watch:
# 	@echo "Watching for changes and serving..."
# 	$(MDBOOK) serve --open $(BOOK_DIR)

# # Build and then serve
# .PHONY: build-serve
# build-serve: build serve

# # Short aliases
# .PHONY: c
# c: clean

# .PHONY: b
# b: build

# .PHONY: s
# s: serve

# .PHONY: w
# w: watch

# # Help target
# .PHONY: help
# help:
# 	@echo "mdBook Makefile"
# 	@echo ""
# 	@echo "Available targets:"
# 	@echo "  all/build    Build the book (default)"
# 	@echo "  clean        Clean generated files"
# 	@echo "  build        Build the book"
# 	@echo "  serve        Serve the book locally"
# 	@echo "  watch        Watch for changes and serve with auto-reload"
# 	@echo "  build-serve  Build then serve"
# 	@echo "  help         Show this help message"
# 	@echo ""
# 	@echo "Short aliases:"
# 	@echo "  b = build, c = clean, s = serve, w = watch"
# 	@echo ""
# 	@echo "Variables (can override with VAR=value):"
# 	@echo "  BOOK_DIR    = $(BOOK_DIR)"
# 	@echo "  BUILD_DIR   = $(BUILD_DIR)"
# 	@echo "  MDBOOK      = $(MDBOOK)"
