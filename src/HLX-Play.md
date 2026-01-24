# Hi

```rust
println!("Hi LUXXXXXXXXX, just testin");
```

```rust,editable
fn main() {
    let choice = 4 ; // ← Change this to 1-4
    
    let square = match choice {
        1 => '🟥',  // Red
        2 => '🟩',  // Green
        3 => '🟦',  // Blue
        4 => '🟪',  // Purple
        _ => '⬛',  // Default
    };
    
    println!("The Selection is {}", square);  // Shows just one colored block
}
```

### Basic Syntax
```admonish note
This is a note admonition with default styling.
```

```admonish details collapsible=true title="Click to expand"
Hidden content that can be revealed.
More details here...
```

```admonish title="Sneaky", collapsible=true
Content will be hidden initially.
```
