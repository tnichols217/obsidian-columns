# Obsidian Columns

Allows you to create columns in Obsidian

Adds two codeblock languages: col and col-md.
The md codeblock is just markdown
The col codeblock renders each markdown element as its own column.
- use the md codeblock to group elements as one column

Ex:

\`\```col\
\```col-md\
(Stuff inside the first column\
\```\
\```col-md\
(stuff inside the second column)\
\```\
\`\```

You can also create columns by creating a list in the structure shown:
- !!!col
    - (flex-grow)
        - (Text in column 1)
    - (flex-grow)
        - (Text in column 2)

Ex:
- !!!col
    - 1
        - Hi, this is text in column 1
    - 2
        - This is in the column to the right
        - This column is twice as wide as the first one

If the flex-grow value specified is not a number, it defaults to the value specified in styles.css, by default 1

## TODO

1. Enable syntax highlighting for editor.
