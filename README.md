# Obsidian Columns

Allows you to create columns in Obsidian\
This plugin also works on mobile with a column wrapping feature (that you can enable in settings)

Adds two codeblock languages: col and col-md.\
And special list syntax to create columns.\
The col-md codeblock is just markdown\
The col codeblock renders each markdown element as its own column.
- use the md codeblock to group elements as one column

![image](https://user-images.githubusercontent.com/62992267/165693107-a19aa048-62e4-44a2-ad23-3bff41deb865.png)

Produced by the MD below:
`````md
````col
```col-md
First column!

- List in column 1
	1. Item 1
	2. Item 2
	3. Item 3
- Random list items
- Extra things
```

> [!info] Callouts
>  Stuff inside the callout
>  More stuff inside.
>> [!ERROR] Error description
>>  Nested callout
>>  ```col-md
>>  - example MD code
>>  - more stuff
>>  ```

```js
  let msg = "Hello, world!";
  console.log(msg)
```
````
`````

!!! **Dont forget to use additional backticks when using recursive codeblocks!** Ex: col has 4 ticks and col-md has 3

You can also create columns by creating a list in the structure shown:
- !!!col
    - (flex-grow)
        - (Text in column 1)
    - (flex-grow)
        - (Text in column 2)

![image](https://user-images.githubusercontent.com/62992267/165693531-5a9d7e8e-864f-40db-a936-cefdb333af22.png)

Produced by the MD code below:
```md
- !!!col
	- 1
		# Column 1
		Some example text in column 1
		- some lists inside as well
			- more list items
	- 2
		# Column 2
		This column is twice as wide because it has the value set to 2
		- !!!col
			- 1
			  ## Column 2-1
			  You can even have columns inside columns!
			- 1
			  ## Column 2-2
			  More example text inside this column
```

## Settings
### Minimum Width of Column
This setting ensures that columns are a certain width. If not all the columns satisfy this width, extra columns will wrap to below (as rows).
Technically, just sets the flex-basis attribute.

### Default span
This setting sets the default span value for a column if it is not explicitly specified. For the time being, col codeblocks have each column set to this value and cannot be changed.

## Upcoming features

1. Enable syntax highlighting for editor.
2. Have per column group and per column settings (custom settings for each column)
3. Edit span for codeblocks

If you enjoy my plugin, please consider supporting me:

<a href="https://www.buymeacoffee.com/tnichols217" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60" /></a>
