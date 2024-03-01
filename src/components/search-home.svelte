<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { checkBlockFold, lsNotebooks, sql as query } from "@/utils/api";
    import {
        DocumentQueryCriteria,
        generateDocumentCountSql,
        generateDocumentSearchSql,
    } from "@/libs/search-sql";
    import {
        // showMessage,
        Protyle,
        openTab,
        openMobileFileById,
        getFrontend,
        Dialog,
        Constants,
        TProtyleAction,
    } from "siyuan";
    import SearchResultItem from "@/libs/search-result-item.svelte";
    import { DocumentSearchResultItem } from "@/libs/search-data";
    import { convertIalStringToObject, convertIconInIal } from "@/libs/icons";
    import { SettingConfig } from "@/libs/setting-config";
    import SettingTypes from "@/libs/setting-types.svelte";
    import SettingNotebook from "@/libs/setting-notebook.svelte";
    import SettingAttr from "@/libs/setting-attr.svelte";
    import SettingOther from "@/libs/setting-other.svelte";

    export let app;
    export let showPreview;

    let isMobile: boolean;
    const frontEnd = getFrontend();
    isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

    let element: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;

    let previewDivElement: HTMLDivElement;
    let previewProtyle: Protyle;
    let searchInputKey: string = "";
    let searchResults: DocumentSearchResultItem[] = [];
    let selectedIndex: number = -1;
    let itemClickCount = 0;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let hiddenSearchResult: boolean = false;
    let searchResultDocumentCount: number = null;
    // let searchResultTotalCount: number = null;
    let lastKeywords: string[];
    let curPage: number = 0;
    let totalPage: number = 0;
    let notebookMap: Map<string, Notebook> = new Map();

    onMount(async () => {
        previewProtyle = new Protyle(app, previewDivElement, {
            blockId: "",
            render: {
                gutter: true,
                breadcrumbDocName: true,
            },
        });
        resize();
    });

    function handleSearchDragMousdown(event: MouseEvent) {
        /* 复制 https://vscode.dev/github/siyuan-note/siyuan/blob/master/app/src/search/util.ts#L407 
            #genSearch 方法下的 const dragElement = element.querySelector(".search__drag"); 处
        */
        const dragElement = element.querySelector(".search__drag");
        const documentSelf = document;
        const nextElement = dragElement.nextElementSibling as HTMLElement;
        const previousElement =
            dragElement.previousElementSibling as HTMLElement;
        const direction = "lr";
        // window.siyuan.storage[Constants.LOCAL_SEARCHKEYS][
        //     closeCB ? "layout" : "layoutTab"
        // ] === 1
        //     ? "lr"
        //     : "tb";
        const x = event[direction === "lr" ? "clientX" : "clientY"];
        const previousSize =
            direction === "lr"
                ? previousElement.clientWidth
                : previousElement.clientHeight;
        const nextSize =
            direction === "lr"
                ? nextElement.clientWidth
                : nextElement.clientHeight;

        nextElement.classList.remove("fn__flex-1");
        nextElement.style[direction === "lr" ? "width" : "height"] =
            nextSize + "px";

        documentSelf.onmousemove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            const previousNowSize =
                previousSize +
                (moveEvent[direction === "lr" ? "clientX" : "clientY"] - x);
            const nextNowSize =
                nextSize -
                (moveEvent[direction === "lr" ? "clientX" : "clientY"] - x);
            if (previousNowSize < 120 || nextNowSize < 120) {
                return;
            }
            nextElement.style[direction === "lr" ? "width" : "height"] =
                nextNowSize + "px";
        };

        documentSelf.onmouseup = () => {
            documentSelf.onmousemove = null;
            documentSelf.onmouseup = null;
            documentSelf.ondragstart = null;
            documentSelf.onselectstart = null;
            documentSelf.onselect = null;
            // window.siyuan.storage[Constants.LOCAL_SEARCHKEYS][
            //     direction === "lr"
            //         ? closeCB
            //             ? "col"
            //             : "colTab"
            //         : closeCB
            //           ? "row"
            //           : "rowTab"
            // ] =
            //     nextElement[
            //         direction === "lr" ? "clientWidth" : "clientHeight"
            //     ] + "px";
            // setStorageVal(
            //     Constants.LOCAL_SEARCHKEYS,
            //     window.siyuan.storage[Constants.LOCAL_SEARCHKEYS],
            // );
            // if (direction === "lr") {
            //     resize(edit.protyle);
            // }
        };
    }

    onDestroy(() => {
        // showMessage("Hello panel closed");
        previewProtyle.destroy();
    });

    export function resize(clientWidth?: number) {
        if (!document) {
            return;
        }
        if (previewProtyle && element.offsetWidth) {
            previewProtyle.protyle.element.style.width =
                element.offsetWidth / 2 + "px";
        }
        inputCursorInit();

        if (clientWidth) {
            if (clientWidth == 0) {
                hiddenSearchResult = true;
            } else {
                hiddenSearchResult = false;
            }
        }
    }

    function inputCursorInit() {
        if (!documentSearchInputElement) {
            return;
        }
        documentSearchInputElement.focus();
    }

    function searchHidtoryBtnClick() {
        console.log("点击搜索历史按钮");
    }

    function handleKeyDownDefault() {}

    function handleKeyDownSelectItem(event: KeyboardEvent) {
        if (!event || !event.key) {
            return;
        }
        let keydownKey = event.key;
        if (
            keydownKey !== "ArrowUp" &&
            keydownKey !== "ArrowDown" &&
            keydownKey !== "Enter"
        ) {
            return;
        }
        event.stopPropagation();

        let selectedItem: DocumentSearchResultItem = null;
        if (event.key === "ArrowUp") {
            if (selectedIndex > 0) {
                selectedIndex -= 1;
            }
        } else if (event.key === "ArrowDown") {
            let lastSubItems = searchResults[searchResults.length - 1].subItems;
            let lastIndex = searchResults[searchResults.length - 1].index;
            if (lastSubItems && lastSubItems.length > 0) {
                lastIndex = lastSubItems[lastSubItems.length - 1].index;
            }
            if (selectedIndex < lastIndex) {
                selectedIndex += 1;
            }
        }
        for (const item of searchResults) {
            if (selectedIndex == item.index) {
                selectedItem = item;
                break;
            }
            for (const subItem of item.subItems) {
                if (selectedIndex == subItem.index) {
                    selectedItem = subItem;
                    break;
                }
            }
        }

        if (!selectedItem) {
            return;
        }
        // refreshBlockPreviewBox(selectedItem.block.id);
        inputCursorInit();

        if (event.key === "Enter") {
            openBlockTab(selectedItem.block.id);
        }
    }

    function handleSearchInputChange(event) {
        let inputValue = event.target.value;

        // 更新输入值
        searchInputKey = inputValue;
        // 清除之前的定时器
        clearTimeout(inputChangeTimeoutId);

        inputChangeTimeoutId = setTimeout(() => {
            refreshSearch(inputValue, 1);
        }, 400);
    }

    function pageTurning(page: number) {
        if (page < 1 || page > totalPage) {
            return;
        }
        refreshSearch(searchInputKey, page);
    }

    function refreshSearch(searchKey: string, pageNum: number) {
        // 去除多余的空格，并将输入框的值按空格分割成数组
        const keywords = searchKey.trim().replace(/\s+/g, " ").split(" ");

        // 过滤掉空的搜索条件并使用 Set 存储唯一的关键词
        const uniqueKeywordsSet = new Set(
            keywords.filter((keyword) => keyword.length > 0),
        );

        // 将 Set 转换为数组
        let uniqueKeywords = Array.from(uniqueKeywordsSet);

        searchBlockByKeywords(uniqueKeywords, pageNum);
    }

    async function searchBlockByKeywords(keywords: string[], pageNum: number) {
        lastKeywords = keywords;
        if (!keywords || keywords.length <= 0) {
            searchResultDocumentCount = 0;
            // searchResultTotalCount = 0;
            curPage = 0;
            totalPage = 0;
            searchResults = [];
            return;
        }

        updateNotebookMap();

        let pageSize = SettingConfig.ins.pageSize;
        let types = SettingConfig.ins.includeTypes;
        let queryFields = SettingConfig.ins.includeQueryFields;
        let excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;
        let pages = [pageNum, pageSize];
        let documentSortMethod = SettingConfig.ins.documentSortMethod;
        let contentBlockSortMethod = SettingConfig.ins.contentBlockSortMethod;
        selectedIndex = -1;

        let documentSearchCriterion: DocumentQueryCriteria =
            new DocumentQueryCriteria(
                keywords,
                pages,
                documentSortMethod,
                contentBlockSortMethod,
                types,
                queryFields,
                excludeNotebookIds,
            );

        isSearching++;
        let documentCountSql = generateDocumentCountSql(
            documentSearchCriterion,
        );
        let queryDocumentCountPromise: Promise<any[]> = query(documentCountSql);
        queryDocumentCountPromise
            .then((documentCountResults: any[]) => {
                processSearchResultCount(
                    documentCountResults,
                    pageNum,
                    pageSize,
                );
            })
            .catch((error) => {
                console.error("Error:", error);
            });

        isSearching++;

        let documentSearchSql = generateDocumentSearchSql(
            documentSearchCriterion,
        );
        let documentSearchPromise: Promise<Block[]> = query(documentSearchSql);
        documentSearchPromise
            .then((documentSearchResults: Block[]) => {
                processSearchResults(documentSearchResults, keywords);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    function processSearchResultCount(
        documentCountResults: any[],
        pageNum: number,
        pageSize: number,
    ) {
        isSearching = Math.max(0, isSearching - 1);
        // searchResultTotalCount = 0;
        // for (const item of documentCountResults) {
        //     searchResultTotalCount += item.contentCount;
        // }
        if (documentCountResults && documentCountResults.length > 0) {
            searchResultDocumentCount = documentCountResults[0].documentCount;
            curPage = pageNum;
            totalPage = Math.ceil(searchResultDocumentCount / pageSize);
        }
    }

    function processSearchResults(blocks: Block[], keywords: string[]) {
        searchResults = [];
        isSearching = Math.max(0, isSearching - 1);
        if (!blocks) {
            blocks = [];
            return;
        }

        const documentBlockMap: Map<string, DocumentSearchResultItem> =
            new Map();

        for (const block of blocks) {
            if (!block) {
                continue;
            }

            highlightBlockContent(block, keywords);

            let rootId = block.root_id;
            let documentItem = new DocumentSearchResultItem();
            documentItem.block = block;
            documentItem.subItems = [];
            documentItem.isCollapsed = true;

            let curParentItem: DocumentSearchResultItem = null;
            if (documentBlockMap.has(rootId)) {
                curParentItem = documentBlockMap.get(rootId);
            } else {
                curParentItem = new DocumentSearchResultItem();
                curParentItem.subItems = [];
                documentBlockMap.set(rootId, curParentItem);
            }

            curParentItem.subItems.push(documentItem);

            if (block.type === "d") {
                if (curParentItem.subItems) {
                    documentItem.subItems = curParentItem.subItems;
                }
                if (blocks.length > SettingConfig.ins.maxExpandCount) {
                    documentItem.isCollapsed = true;
                } else {
                    documentItem.isCollapsed = false;
                }
                if (block.ial) {
                    let ial = convertIalStringToObject(block.ial);
                    documentItem.icon = convertIconInIal(ial.icon);
                }
                documentItem.path =
                    notebookMap.get(block.box).name + block.hpath;
                searchResults.push(documentItem);
                documentBlockMap.set(rootId, documentItem);
            }
        }

        let documentSortMethod = SettingConfig.ins.documentSortMethod;
        let documentSortFun: (
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
        ) => number;
        if (documentSortMethod == "modifiedAsc") {
            documentSortFun = function (
                a: DocumentSearchResultItem,
                b: DocumentSearchResultItem,
            ): number {
                return Number(a.block.updated) - Number(b.block.updated);
            };
        } else if (documentSortMethod == "modifiedDesc") {
            documentSortFun = function (
                a: DocumentSearchResultItem,
                b: DocumentSearchResultItem,
            ): number {
                return Number(b.block.updated) - Number(a.block.updated);
            };
        } else if (documentSortMethod == "createdAsc") {
            documentSortFun = function (
                a: DocumentSearchResultItem,
                b: DocumentSearchResultItem,
            ): number {
                return Number(a.block.created) - Number(b.block.created);
            };
        } else if (documentSortMethod == "createdDesc") {
            documentSortFun = function (
                a: DocumentSearchResultItem,
                b: DocumentSearchResultItem,
            ): number {
                return Number(b.block.created) - Number(a.block.created);
            };
        } else if (documentSortMethod == "rankAsc") {
            documentSortFun = function (
                a: DocumentSearchResultItem,
                b: DocumentSearchResultItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = aRank - bRank;
                result =
                    result == 0
                        ? Number(b.block.updated) - Number(a.block.updated)
                        : result;
                return result;
            };
        } else {
            documentSortFun = function (
                a: DocumentSearchResultItem,
                b: DocumentSearchResultItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = bRank - aRank;
                result =
                    result == 0
                        ? Number(b.block.updated) - Number(a.block.updated)
                        : result;
                return result;
            };
        }

        searchResults.sort(documentSortFun);

        let index = 0;
        for (const item of searchResults) {
            if (!SettingConfig.ins.showChildDocument) {
                if (item.subItems.length > 1) {
                    let documentItemIndex = 0;
                    for (let i: number = 0; i < item.subItems.length; i++) {
                        let subItem = item.subItems[i];
                        if (subItem.block.type === "d") {
                            documentItemIndex = i;
                            break;
                        }
                    }
                    item.subItems.splice(documentItemIndex, 1);
                }
            }
            item.index = index;
            for (const subItem of item.subItems) {
                if (item.block.id === subItem.block.id) {
                    continue;
                }
                index++;
                subItem.index = index;
            }
            index++;
        }
        searchResults = searchResults;
    }

    function highlightBlockContent(block: Block, keywords: string[]) {
        if (!block) {
            return;
        }
        let contentHtml = getHighlightedContent(block.content, keywords);
        let nameHml = getHighlightedContent(block.name, keywords);
        let aliasHtml = getHighlightedContent(block.alias, keywords);
        let memoHtml = getHighlightedContent(block.memo, keywords);
        block.content = contentHtml;
        block.name = nameHml;
        block.alias = aliasHtml;
        block.memo = memoHtml;
    }

    function getHighlightedContent(content: string, keywords: string[]) {
        if (!content) {
            return content;
        }
        let highlightedContent: string = escapeHtml(content);

        if (keywords) {
            highlightedContent = highlightMatches(highlightedContent, keywords);
        }
        return highlightedContent;
    }

    function highlightMatches(searchString: string, array: string[]) {
        if (!array.length || !searchString) {
            return searchString; // 返回原始字符串，因为没有需要匹配的内容
        }

        const regexPattern = new RegExp(`(${array.join("|")})`, "gi");
        const highlightedString = searchString.replace(
            regexPattern,
            "<mark>$1</mark>",
        );
        return highlightedString;
    }

    function highlightContentMatches(searchString: string, array: string[]) {
        if (!array.length || !searchString) {
            return searchString; // 返回原始字符串，因为没有需要匹配的内容
        }

        const regexPattern = new RegExp(`(${array.join("|")})`, "gi");
        const highlightedString = searchString.replace(
            regexPattern,
            "<span data-type='search-mark'>$1</span>",
        );
        return highlightedString;
    }

    function escapeHtml(input: string): string {
        const escapeMap: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return input.replace(/[&<>"']/g, (match) => escapeMap[match]);
    }

    function clickItem(item: DocumentSearchResultItem) {
        let block = item.block;
        let blockId = block.id;
        selectedIndex = item.index;
        let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;

        if (!showPreview) {
            openBlockTab(blockId);
        } else {
            itemClickCount++;
            if (itemClickCount === 1) {
                // 单击逻辑
                setTimeout(() => {
                    if (itemClickCount === 1) {
                        refreshBlockPreviewBox(blockId);
                    }
                    itemClickCount = 0; // 重置计数
                }, doubleClickTimeout);
            } else if (itemClickCount === 2) {
                openBlockTab(blockId);
                itemClickCount = 0; // 重置计数
            }
        }
    }

    function openBlockTab(blockId: string) {
        checkBlockFold(blockId)
            .then((zoomIn: boolean) => {
                let actions: TProtyleAction[] = zoomIn
                    ? [
                          Constants.CB_GET_HL,
                          Constants.CB_GET_FOCUS,
                          Constants.CB_GET_ALL,
                      ]
                    : [
                          Constants.CB_GET_HL,
                          Constants.CB_GET_FOCUS,
                          Constants.CB_GET_CONTEXT,
                          Constants.CB_GET_ROOTSCROLL,
                      ];
                if (isMobile === true) {
                    openMobileFileById(app, blockId, actions);
                } else {
                    openTab({
                        app: app,
                        doc: {
                            id: blockId,
                            action: actions,
                        },
                    });
                }
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    function refreshBlockPreviewBox(blockId: string) {
        if (!showPreview) {
            return;
        }
        if (!blockId) {
            return;
        }

        // if (
        //     previewProtyle &&
        //     previewProtyle.protyle &&
        //     previewProtyle.protyle.block &&
        //     previewProtyle.protyle.block.id == blockId
        // ) {
        //     return;
        // }

        checkBlockFold(blockId)
            .then((zoomIn: boolean) => {
                let actions: TProtyleAction[] = zoomIn
                    ? [Constants.CB_GET_HL, Constants.CB_GET_ALL]
                    : [
                          Constants.CB_GET_HL,
                          Constants.CB_GET_CONTEXT,
                          Constants.CB_GET_ROOTSCROLL,
                      ];

                previewProtyle = new Protyle(app, previewDivElement, {
                    blockId: blockId,
                    render: {
                        gutter: true,
                        breadcrumbDocName: true,
                    },
                    action: actions,
                    after: (protyle: Protyle) => {
                        let protyleContentElement =
                            protyle.protyle.contentElement;
                        htmlHighlight(
                            protyleContentElement,
                            lastKeywords,
                            blockId,
                        );
                        // 延迟刷新一次，目前用于代码块、或挂件内容高亮
                        let refreshPreviewHighlightTimeout =
                            SettingConfig.ins.refreshPreviewHighlightTimeout;
                        if (
                            refreshPreviewHighlightTimeout &&
                            refreshPreviewHighlightTimeout > 0
                        ) {
                            setTimeout(() => {
                                htmlHighlight(
                                    protyleContentElement,
                                    lastKeywords,
                                    blockId,
                                );
                            }, refreshPreviewHighlightTimeout);
                        }
                    },
                });
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    async function htmlHighlight(
        contentElement: HTMLElement,
        keywords: string[],
        targetBlockId: string,
    ) {
        if (!contentElement || !keywords) {
            return;
        }
        // If the CSS Custom Highlight API is not supported,
        // display a message and bail-out.
        if (!CSS.highlights) {
            console.log("CSS Custom Highlight API not supported.");
            return;
        }

        // Find all text nodes in the article. We'll search within
        // these text nodes.
        const treeWalker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
        );
        const allTextNodes: Node[] = [];
        let currentNode = treeWalker.nextNode();
        while (currentNode) {
            allTextNodes.push(currentNode);
            currentNode = treeWalker.nextNode();
        }

        // Clear the HighlightRegistry to remove the
        // previous search results.
        CSS.highlights.clear();

        // Clean-up the search query and bail-out if
        // if it's empty.

        let ranges: Range[] = [];
        let matchElement = null;
        for (const queryStr of keywords) {
            if (!queryStr) {
                continue;
            }
            // Iterate over all text nodes and find matches.
            allTextNodes
                .map((el: Node) => {
                    return { el, text: el.textContent.toLowerCase() };
                })
                .map(({ el, text }) => {
                    const indices = [];
                    let startPos = 0;
                    while (startPos < text.length) {
                        const index = text.indexOf(
                            queryStr.toLowerCase(),
                            startPos,
                        );
                        if (index === -1) break;
                        if (!matchElement) {
                            let nodeId = getNodeID(el);
                            if (targetBlockId == nodeId) {
                                matchElement = el.parentElement;
                            }
                        }

                        indices.push(index);
                        startPos = index + queryStr.length;
                    }

                    // Create a range object for each instance of
                    // str we found in the text node.
                    indices.map((index) => {
                        const range = new Range();
                        range.setStart(el, index);
                        range.setEnd(el, index + queryStr.length);
                        ranges.push(range);
                    });
                });

            // Create a Highlight object for the ranges.
        }
        ranges = ranges.flat();
        if (!ranges || ranges.length <= 0) {
            return;
        }
        const searchResultsHighlight = new Highlight(...ranges);

        // Register the Highlight object in the registry.
        CSS.highlights.set("search-result-mark", searchResultsHighlight);
        renderNextSearchMark(previewProtyle, matchElement);
    }

    function getNodeID(node: Node | null): string | null {
        if (!node) {
            return null;
        }
        if (node instanceof Element) {
            const nodeId = (node as HTMLElement).getAttribute("data-node-id");
            if (nodeId) {
                return nodeId;
            }
        }
        // 递归查找父节点
        return getNodeID(node.parentNode);
    }

    /**
     * 官方规则高亮方法。
     * 但是对于加粗、引用等有行内样式的文本，高亮标签会嵌套在行内样式标签内，造成DOM结构变化，并且不符合官方的规律。
     * 暂时不用。
     * @param contentElement
     * @param keywords
     */
    function protyleHighlightQueryStr(
        contentElement: HTMLElement,
        keywords: string[],
    ) {
        if (!contentElement || !keywords) {
            return;
        }

        // Find all text nodes in the article. We'll search within
        // these text nodes.
        const treeWalker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
        );
        const allTextNodes: Node[] = [];
        let currentNode = treeWalker.nextNode();
        while (currentNode) {
            allTextNodes.push(currentNode);
            currentNode = treeWalker.nextNode();
        }

        for (const textNode of allTextNodes) {
            if (!textNode || !textNode.parentElement) {
                continue;
            }
            const regexPattern = new RegExp(`(${keywords.join("|")})`, "gi");
            if (textNode.textContent.match(regexPattern)) {
                textNode.parentElement.innerHTML = highlightContentMatches(
                    textNode.textContent,
                    keywords,
                );
            }
        }
    }

    const renderNextSearchMark = (edit: Protyle, matchElement) => {
        // const allMatchElements = Array.from(
        //     options.edit.protyle.wysiwyg.element.querySelectorAll(
        //         `div[data-node-id="${options.id}"] span[data-type~="search-mark"]`,
        //     ),
        // );
        // allMatchElements.find((item, itemIndex) => {
        //     if (item.classList.contains("search-mark--hl")) {
        //         item.classList.remove("search-mark--hl");
        //         matchElement = allMatchElements[itemIndex + 1];
        //         return;
        //     }
        // });
        // if (!matchElement) {
        //     matchElement = allMatchElements[0];
        // }
        if (matchElement) {
            // matchElement.classList.add("search-mark--hl");
            const contentRect =
                edit.protyle.contentElement.getBoundingClientRect();
            edit.protyle.contentElement.scrollTop =
                edit.protyle.contentElement.scrollTop +
                matchElement.getBoundingClientRect().top -
                contentRect.top -
                contentRect.height / 2;
        }
    };

    function toggleAllCollpsedItem(isCollapsed: boolean) {
        if (!isCollapsed) {
            // if (searchResultTotalCount > maxExpandCount) {
            //     showMessage(
            //         `当前搜索结果超过 ${maxExpandCount} 条，不允许全部展开！`,
            //         5000,
            //         "error",
            //     );
            //     return;
            // }
        }

        for (const item of searchResults) {
            if (
                !item ||
                !item.block ||
                !item.subItems ||
                item.subItems.length <= 0
            ) {
                continue;
            }
            item.isCollapsed = isCollapsed;
        }
        searchResults = searchResults;
    }

    async function updateNotebookMap() {
        let notebooks: Notebook[] = (await lsNotebooks()).notebooks;
        for (const notebook of notebooks) {
            notebookMap.set(notebook.id, notebook);
        }
    }

    function clickSearchNotebookFilter() {
        let dialog = new Dialog({
            title: "笔记本过滤",
            content: `<div id="settingNotebook" class="b3-dialog__content" ></div>`,
            width: this.isMobile ? "92vw" : "520px",
            height: "70vh",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                // refreshSearch(searchInputKey, 1);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            },
        });
        let pannel = new SettingNotebook({
            target: dialog.element.querySelector("#settingNotebook"),
        });
    }

    function clickSearchTypeFilter() {
        let dialog = new Dialog({
            title: "类型",
            content: `<div id="settingType" class="b3-dialog__content" ></div>`,
            width: this.isMobile ? "92vw" : "520px",
            height: "70vh",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                // refreshSearch(searchInputKey, 1);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            },
        });
        let pannel = new SettingTypes({
            target: dialog.element.querySelector("#settingType"),
        });
    }

    function clickSearchAttrFilter() {
        let dialog = new Dialog({
            title: "属性",
            content: `<div id="settingAttr" class="b3-dialog__content" ></div>`,
            width: this.isMobile ? "92vw" : "520px",
            height: "70vh",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                // refreshSearch(searchInputKey, 1);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            },
        });
        let pannel = new SettingAttr({
            target: dialog.element.querySelector("#settingAttr"),
        });
    }

    function clickSearchSettingOther() {
        let dialog = new Dialog({
            title: "其他设置",
            content: `<div id="settingOther" class="b3-dialog__content" ></div>`,
            width: this.isMobile ? "92vw" : "520px",
            height: "70vh",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                // refreshSearch(searchInputKey, 1);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            },
        });
        let pannel = new SettingOther({
            target: dialog.element.querySelector("#settingOther"),
        });
    }
</script>

<div class="fn__flex-column" style="height: 100%;" bind:this={element}>
    <!-- <div class="layout-tab-container fn__flex-1" bind:this={element}> -->

    <div class="block__icons" style="overflow: auto">
        <span
            data-position="9bottom"
            data-type="previous"
            class="block__icon block__icon--show ariaLabel
            {curPage <= 1 ? 'disabled' : ''}"
            aria-label="上一页"
            on:click={() => {
                pageTurning(curPage - 1);
            }}
            on:keydown={handleKeyDownDefault}
            ><svg><use xlink:href="#iconLeft"></use></svg></span
        >
        <span class="fn__space"></span>
        <span
            data-position="9bottom"
            data-type="next"
            class="block__icon block__icon--show ariaLabel
            {curPage >= totalPage ? 'disabled' : ''}"
            aria-label="下一页"
            on:click={() => {
                pageTurning(curPage + 1);
            }}
            on:keydown={handleKeyDownDefault}
            ><svg><use xlink:href="#iconRight"></use></svg></span
        >

        <span class="fn__space"></span>
        <span
            class="fn__flex-shrink ft__selectnone
            {searchResultDocumentCount == null || searchResultDocumentCount == 0
                ? 'fn__none'
                : ''}"
        >
            {curPage}/{totalPage}
            <span class="fn__space"></span>

            <span class="ft__on-surface">
                匹配到 {searchResultDocumentCount} 个文档
                <!-- 中匹配 {searchResultTotalCount}块 -->
            </span>
        </span>
        <span class="fn__space"></span>
        <span class="fn__flex-1" style="min-height: 100%"></span>

        <span class="fn__space"></span>
        <span
            id="documentSearchNotebookFilter"
            aria-label="笔记本过滤"
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchNotebookFilter}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconSearchSettingExcludeNotebook"></use></svg
            >
        </span>
        <span class="fn__space"></span>
        <span
            id="documentSearchTypeFilter"
            aria-label="类型"
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchTypeFilter}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconFilter"></use></svg>
        </span>
        <span class="fn__space"></span>
        <span
            id="documentSearchAttrFilter"
            aria-label="属性"
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchAttrFilter}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconA"></use></svg>
        </span>

        <span class="fn__space"></span>
        <span
            id="documentSearchSettingOther"
            aria-label="其他"
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchSettingOther}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconSearchSettingOther"></use></svg>
        </span>
    </div>
    <div
        class="b3-form__icon search__header"
        on:keydown={handleKeyDownSelectItem}
    >
        <div style="position: relative" class="fn__flex-1">
            <span
                class="search__history-icon"
                id="documentSearchHistoryBtn"
                on:click={searchHidtoryBtnClick}
                on:keydown={handleKeyDownDefault}
            >
                <svg data-menu="true" class="b3-form__icon-icon">
                    <use xlink:href="#iconSearch"></use>
                </svg>
                <svg class="search__arrowdown"
                    ><use xlink:href="#iconDown"></use>
                </svg>
            </span>
            <input
                id="documentSearchInput"
                bind:this={documentSearchInputElement}
                class="b3-text-field b3-text-field--text"
                style="padding-right: 32px !important;"
                on:input={handleSearchInputChange}
                bind:value={searchInputKey}
            />
            <svg
                class="b3-form__icon-clear ariaLabel {searchInputKey == ''
                    ? 'fn__none'
                    : ''}"
                aria-label="清空"
                style="right: 8px;height:42px"
                on:click|stopPropagation={() => {
                    searchInputKey = "";
                    refreshSearch(searchInputKey, 1);
                }}
                on:keydown={handleKeyDownDefault}
            >
                <use xlink:href="#iconCloseRound"></use>
            </svg>
        </div>
        <div class="block__icons">
            <span
                id="documentSearchRefresh"
                aria-label="刷新"
                class="block__icon ariaLabel"
                data-position="9bottom"
                on:click|stopPropagation={() => {
                    refreshSearch(searchInputKey, curPage);
                }}
                on:keydown={handleKeyDownDefault}
            >
                <svg><use xlink:href="#iconRefresh"></use></svg>
            </span>

            <div class="fn__flex">
                <span class="fn__space"></span>
                <span
                    id="documentSearchExpand"
                    class="block__icon block__icon--show ariaLabel"
                    data-position="9bottom"
                    aria-label="展开"
                    on:click={() => {
                        toggleAllCollpsedItem(false);
                    }}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg><use xlink:href="#iconExpand"></use></svg>
                </span>
                <span class="fn__space"></span>
                <span
                    id="documentSearchCollapse"
                    class="block__icon block__icon--show ariaLabel"
                    data-position="9bottom"
                    aria-label="折叠"
                    on:click={() => {
                        toggleAllCollpsedItem(true);
                    }}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg><use xlink:href="#iconContract"></use></svg>
                </span>
            </div>
        </div>
    </div>
    <div class="search__layout search__layout--row">
        {#if !hiddenSearchResult}
            <SearchResultItem
                {searchResults}
                {selectedIndex}
                clickCallback={clickItem}
            />
        {/if}
        <div class="search__drag" on:mousedown={handleSearchDragMousdown}></div>
        <div
            id="documentSearchPreview"
            class="search__preview {showPreview ? '' : 'fn__none'}"
            bind:this={previewDivElement}
        ></div>
    </div>
</div>
<div class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img width="120px" src="/stage/loading-pure.svg" />
</div>

<style>
    .block__icon--show.block__icon.disabled {
        opacity: 0.38;
        cursor: not-allowed;
    }

    ::highlight(search-result-mark) {
        background-color: var(--b3-protyle-inline-mark-background);
        color: var(--b3-protyle-inline-mark-color);
    }
</style>
