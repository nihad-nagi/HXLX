# HXBook Admonish - Custom mdBook Admonition Preprocessor

A vendored, self-contained mdBook preprocessor for creating Material Design-styled admonition blocks with custom colors, icons, and collapsible functionality.

## Overview

This preprocessor transforms code blocks with the admonish language tag into styled admonition boxes in your mdBook output. It's designed to be fully self-contained with local assets and no external dependencies.
Features

    Custom Color System: Use HSL angles (1-40) or hex colors for admonitions

    Icon Support: Emoji, URLs, or text-based icons

    Collapsible Sections: Optionally make admonitions expandable/collapsible

    Built-in Directives: Pre-defined styles for common admonition types

    Vendored Assets: All CSS is local - no CDN dependencies

    GitHub Pages Compatible: Designed to work with GitHub Pages deployment

## Project Structure

```text

hxbook-admonish/
├── assets/                    # Static assets
│   └── hxbook-admonish.css   # Default CSS styles
├── src/
│   ├── config.rs            # Configuration parsing
│   ├── lib.rs               # Module exports
│   ├── main.rs              # CLI entry point
│   ├── markdown.rs          # Markdown processing
│   ├── parse.rs             # Directive parsing
│   ├── render.rs            # HTML rendering
│   └── types.rs             # Type definitions
├── Cargo.toml               # Rust dependencies
├── Cargo.lock               # Dependency lockfile
└── README.md                # This file
```

## Usage in Markdown

### Basic Syntax
markdown

```admonish note
This is a note admonition with default styling.
```


### With Title
markdown

```admonish warning title="Important Warning"
This content requires your attention.
```

### With Custom Color
markdown

```admonish tip color=22
Tips use HSL angle 22 (greenish).
```

```admonish custom color="#FF6B6B"
Custom hex color admonition.
```

### With Icon
markdown

```admonish info icon="ℹ️"
Information with an emoji icon.
```

```admonish rocket icon="🚀"
Launch-related content.
```

### Collapsible
markdown

```admonish details collapsible=true title="Click to expand"
Hidden content that can be revealed.
More details here...
```

### With CSS Classes
markdown

```admonish note .important .highlight
Custom-styled note with additional CSS classes.
```

### With ID
markdown

```admonish warning id="specific-warning"
An admonition with a specific ID for linking.
```

### Built-in Directives

The following built-in directives are available with default HSL mappings:
Directive	HSL Angle	Typical Use
note	5°	General notes
info	6°	Informational content
tip	22°	Helpful tips
warning	10°	Warnings
danger	1°	Critical information
success	22°	Success messages
question	30°	Questions or FAQs
bug	35°	Bug reports
example	33°	Examples
## Configuration

Add to your book.toml:
```toml

[preprocessor.hxbook-admonish]
command = "./plugins/hxbook-admonish/target/debug/hxbook-admonish"
default_title = "Note"
default_collapsible = false
css_id_prefix = ""

# Icon aliases
[preprocessor.hxbook-admonish.icons]
warning = "⚠️"
check = "✅"
info = "ℹ️"
lightbulb = "💡"
rocket = "🚀"
book = "📖"
lock = "🔒"
```

### Configuration Options

    default_title: Default title when none specified

    default_collapsible: Whether admonitions are collapsible by default

    css_id_prefix: Prefix for generated CSS IDs

    icons: Map of icon aliases to icon definitions (emoji, URLs, or text)

## Installation & Setup
### For Development

    Build the preprocessor:

bash

cargo build

    Install into your mdBook project:

bash

./target/debug/hxbook-admonish install /path/to/your/book

This will:

    Copy hxbook-admonish.css to your book's source directory

    Update book.toml with the preprocessor configuration

    Add the CSS to additional-css

    Build your book:

bash

mdbook build

### For GitHub Pages Deployment

The preprocessor is designed to work with GitHub Pages. During mdbook build:

    CSS is generated and written to the build directory

    All assets are local (no CDN dependencies)

    HTML output contains only relative paths

## Color System

### HSL Angles (1-40)

Angles map to hues in 9° increments (1 → 9°, 2 → 18°, ..., 40 → 360°):

    Provides consistent, harmonious color palette

    Easy to remember: note=5, warning=10, success=22

    Automatically generates background and border colors

### Hex Colors

Full hex color support with automatic background transparency:

    #FF6B6B → Red admonition with rgba(255, 107, 107, 0.1) background

    Supports 6-character hex codes

### Custom Styling

The generated CSS uses CSS custom properties for easy theming:
css

.admonition {
    --admonition-color: hsl(45, 70%, 50%); /* Default */
    --admonition-border-color: rgba(0, 0, 0, 0.1);
    --admonition-background: rgba(0, 0, 0, 0.02);
}

Override in your own CSS:
css

.admonition-warning {
    --admonition-color: #FF9800;
}

## Development
### Building
bash

cargo build
cargo build --release

### Testing

Test with a sample mdBook:
bash

cd /path/to/test/book
mdbook build

### Architecture

    Markdown Processing (markdown.rs): Scans for admonish code blocks

    Directive Parsing (parse.rs): Extracts configuration from info string

    Metadata Resolution (parse.rs): Merges with global config

    HTML Rendering (render.rs): Generates final HTML with CSS

    Asset Management (main.rs): Handles CSS file generation and installation

### Adding New Features

    Add new directive to BUILTIN_DIRECTIVES in types.rs

    Update parsing logic in parse.rs if needed

    Add corresponding CSS in render.rs

    Test with sample markdown

## Known Limitations

    Only supports HTML output renderer

    CSS is generated at build time (not dynamic)

    Icons must be emoji, URLs, or single characters

    Nested admonitions within code blocks are not supported

## Troubleshooting

### Admonitions not rendering

    Ensure [preprocessor.hxbook-admonish] is in book.toml

    Check that command points to the correct binary path

    Verify the CSS is included in additional-css

### Styling issues

    Check browser console for CSS loading errors

    Ensure no conflicting CSS rules override admonition styles

    Verify custom colors are valid hex or HSL angles

### Build errors

    Ensure Rust toolchain is up to date

    Check mdBook version compatibility

    Verify all dependencies in Cargo.toml

## License & Credits

This is a vendored, modified version of admonish functionality for internal use with HXLX documentation. Not intended for public distribution.

All assets are self-contained and designed for GitHub Pages deployment.
