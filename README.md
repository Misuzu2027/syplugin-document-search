[中文](README_zh_CN.md)


## Document-based Search
### Features
* Search based on documents
* Ability to set the type of search blocks (isolated from official search types, without affecting each other.)
* Support filtering out less frequently used notebooks
* Support for mobile use (requires Dock bar to be enabled)


### Functions

#### Click Result Positioning
Click on a search result block to position within the document. Works well in long tables or code blocks.

![Image](https://github.com/Misuzu2027/syplugin-document-search/blob/main/src/assets/imgs/click-result-positioning.gif?raw=true)


#### Double-click Search Result to Open Document Tab
Double-click a search result to open the document and jump to the specified location. If it does not open after double-clicking, you can adjust the "Double-click Time Threshold" in the "Other" settings.


#### Single Document Search Result Sorting
* Trigger method:
  * Right-click on document on desktop
  * Long press on document on mobile

![Image](https://github.com/Misuzu2027/syplugin-document-search/blob/main/src/assets/imgs/sorting-menu-en.png?raw=true)


#### Support for Arrow Key Selection
When the cursor is in the input box, you can use the up and down arrow keys to select search results, and press Enter to open the result tab.


#### Code Block, Database Highlighting
After clicking to open a document in the tab search preview area or Dock bar, **code block, database** keyword highlighting and positioning are supported! (Official search currently does not support)
If the highlighting for **code block, database** fails, you can adjust the "Preview Refresh Highlight Delay" in the "Other" settings.


#### Dock Search Supports Searching in Current Document
![Alt text](https://github.com/Misuzu2027/syplugin-document-search/blob/main/src/assets/imgs/search-in-document.png?raw=true)

Closing is for global search, opening is for searching in the current document; when opened, it forces the use of original order. If you want to switch sorting, you can right-click on the document to do so.

In fact, it reads the document where the cursor is last focused. If the desired document is not located, you can switch tabs or reopen the document.


## Flat Document Tree
### Features
* All operations on documents supported by the official document tree are also supported here.
  * Note: Operations such as renaming, deleting, and creating documents require manual refreshing to display the latest data.
* Support for mobile use (requires Dock bar to be enabled)
### Functions
* Supports sorting by modification time, creation time, and reference count.
* Document name search supported in the search box.

## Hide Dock
You can hide unused Docks in the plugin's Dock Settings.
Note: The hiding will be synchronized on mobile.


## Query Syntax

Use `@` followed by specific letters to apply advanced query filters. Prefixing `@` or a keyword with a minus sign `-` excludes blocks matching that condition. For best performance, it’s recommended to use exclusion filters at the end of the query; otherwise, the system first gathers all unmatched blocks, which can cause lag.

### Keyword Search

#### Full-Text Search Enabled

- `work test`: Finds documents that contain both `work` and `test`; then displays blocks that contain either `work` or `test`.
    
- `-work test`: Finds documents that do **not** contain `work` but contain `test`; then displays blocks that contain `test`.
    

#### Full-Text Search Disabled

- `work test`: Finds blocks that contain both `work` and `test`.
    
- `-work test`: Finds blocks that do **not** contain `work` but contain `test`.
    

### `@b` Notebook Filter

- `@bLife`: Displays documents located in notebooks containing the keyword `Life`.
    
- `-@bLife`: Displays documents located in notebooks **not** containing the keyword `Life`.
    
- You can combine filters. For example, `@bLife @bWork` will display documents in notebooks that contain **both** `Life` and `Work`.
    

### `@p` Path Filter

- `@pHobbies`: Displays documents whose path contains the keyword `Hobbies`.
    
- `-@pHobbies`: Displays documents whose path does **not** contain the keyword `Hobbies`.
    
- Combinable with other filters.
    

To view all subdocuments under a document named `HobbiesAndInterests` but exclude the document itself, use `@pHobbies%/`. Adding `%/` at the end denotes subdocuments.

### `@c` Created Time / `@u` Updated Time

Time or date values follow the `yyyyMMddhhmmss` format. For example, March 31, 2025 at 14:42:04 is written as `20250331144204`.

- Notes created (or updated) in March 2025: `@c202503`, `@c=202503`, or `@ceq202503`
    
- Notes created (or updated) after March 15, 2025: `@c>20250315` or `@cgt20250315`
    
- Notes created before 2025: `@c<2025` or `@clt2025`
    
- Notes created in November 2024: `@c>202411 @c<202412`
    

### `@t` Block Type Filter

Block types correspond to `blocks.type` values in the database:

`d` Document | `h` Heading | `l` List | `i` List Item | `c` Code | `m` Math | `t` Table | `b` Quote | `av` Property View (Database) | `s` Super Block | `p` Paragraph | `tb` Table Block | `html` HTML | `video` Video | `audio` Audio | `widget` Widget | `iframe` iFrame | `query_embed` Embedded Query

- `@tav`: Finds all database blocks.
    
- `@thViolet`: Finds heading blocks containing the keyword `Violet`.
    
- `-@thViolet`: Finds all blocks except heading blocks that contain `Violet`. If used alone, this may return a large number of blocks, so it's best to combine it with inclusion keywords first and then filter out unwanted results.
    
- `@th -@thViolet`: Finds all heading blocks, excluding those containing `Violet`.
    
- `@th @tpViolet`: Finds all heading blocks and all paragraph blocks that contain `Violet`.
    

**Note:** Results differ depending on whether full-text search is enabled. Full-text search filters at the document level, while disabled mode filters at the block level. Each block type is treated with an OR logic.

Example:  
`@thViolet -@thGarden`:  
Finds heading blocks containing `Violet` but excludes those containing `Garden`.

- With full-text search enabled: Any document with both `Violet` and `Garden` in heading blocks will be excluded entirely.
    
- With full-text search disabled: Only the heading blocks with `Garden` are excluded; other heading blocks with `Violet` in the same document will still be shown.

## Default Configuration

### Document-based Search

* Default block types for queries:
  * Document, Heading, Code Block, Math Block, Table Block, Paragraph Block, HTML Block, Database, Audio, Video
* Default matching attributes for blocks: Name, Alias, Memo
* Default sorting:
  * Document sorting: Descending by relevance
  * Content block sorting: Type
* Documents per page: 10
* Default maximum expansion count: 100


### Flat Document Tree

* Default sorting: Descending by modification time
* Display 30 items


### keyboard shortcuts

* Currently supported keyboard shortcuts: Open document search tab, Document search Dock, Flat document tree Dock.
* All can be found and modified in "Settings" -> "Keymap" -> "document dearch" in SiYuan.

# Changelog
> [Changelog(Chinese)](./CHANGELOG_zh_CN.md)