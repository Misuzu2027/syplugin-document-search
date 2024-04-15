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

## Default Configuration
* Document-based Search
  * Default block types for queries:
    * Document, Heading, Code Block, Math Block, Table Block, Paragraph Block, HTML Block, Database, Audio, Video
  * Default matching attributes for blocks: Name, Alias, Memo
  * Default sorting:
    * Document sorting: Descending by relevance
    * Content block sorting: Type
  * Documents per page: 10
  * Default maximum expansion count: 100
* Flat Document Tree
  * Default sorting: Descending by modification time
  * Display 30 items

# Changelog
> [Changelog(Chinese)](./CHANGELOG_zh_CN.md)