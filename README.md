# Obsidian Columns

Allows you to create columns in Obsidian

Adds two codeblock languages: col and col-md.
The md codeblock is just markdown
The col codeblock renders each markdown element as its own column.
- use the md codeblock to group elements as one column

You can also create columns by creating a list in the structure shown:
- !!!col
    - (flex-grow)
        - (Text in column 1)
    - (flex-grow)
        - (Text in column 2)

If the flex-grow value specified is not a number, it defaults to the value specified in styles.css

## TODO

1. Enable syntax highlighting for editor.