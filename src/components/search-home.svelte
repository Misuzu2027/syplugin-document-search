<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { sql as query } from "@/utils/api";
    import {
        generateDocumentCountSql,
        generateDocumentSearchSql,
    } from "@/libs/search-sql";
    import {
        // showMessage,
        Protyle,
        openTab,
        openMobileFileById,
        getFrontend,
    } from "siyuan";
    import SearchResultItem from "@/libs/search-result-item.svelte";
    import { DocumentSearchResultItem } from "@/libs/search-data";
    import { convertIalStringToObject, convertIconInIal } from "@/libs/icons";

    export let app;
    export let showPreview;

    let isMobile: boolean;
    const frontEnd = getFrontend();
    isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

    // let time: string = "";
    let element: HTMLElement;

    let previewDiv: HTMLDivElement;
    let previewProtyle: Protyle;
    let searchInputKey: string = "";
    let searchResults: DocumentSearchResultItem[] = [];
    let selectedIndex: number = 0;
    // let renderedSearchResultItems: DocumentSearchResultItem[] = [];
    let itemClickCount = 0;
    let searchResultDivHeight: number;
    let inputChaneTimeout;
    let maxExpandCount: number = 300;
    let isSearching: number = 0;
    let hiddenSearchResult: boolean = false;
    let searchResultDocumentCount: number = null;
    // let searchResultTotalCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;
    let defaultPageSize: number = 10;
    let searchResultItemComponent: SearchResultItem;
    let showChildDocument: boolean = false;

    onMount(async () => {
        resize();
        // previewDivProtyle = new Protyle(
        //     app,
        //     element.querySelector("#searchPreview") as HTMLElement,
        //     {
        //         blockId: "",
        //         render: {
        //             gutter: true,
        //             breadcrumbDocName: true,
        //         },
        //     },
        // );
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
        let minHeight = 240;
        if (!showPreview) {
            minHeight = 199;
        }

        searchResultDivHeight = document.body.scrollHeight - minHeight;

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
        let searchInputElement = document.getElementById(
            "documentSearchInput",
        ) as HTMLInputElement;
        if (!searchInputElement) {
            return;
        }
        searchInputElement.focus();
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
                    selectedItem = item;
                    break;
                }
            }
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
        clearTimeout(inputChaneTimeout);

        inputChaneTimeout = setTimeout(() => {
            refreshSearch(inputValue, 1, defaultPageSize);
        }, 400);
    }

    function pageTurning(page: number) {
        if (page < 1 || page > totalPage) {
            return;
        }
        refreshSearch(searchInputKey, page, defaultPageSize);
    }

    function refreshSearch(
        searchKey: string,
        pageNum: number,
        pageSize: number,
    ) {
        // 去除多余的空格，并将输入框的值按空格分割成数组
        const keywords = searchKey.trim().replace(/\s+/g, " ").split(" ");

        // 过滤掉空的搜索条件并使用 Set 存储唯一的关键词
        const uniqueKeywordsSet = new Set(
            keywords.filter((keyword) => keyword.length > 0),
        );

        // 将 Set 转换为数组
        let uniqueKeywords = Array.from(uniqueKeywordsSet);

        searchBlockByKeywords(uniqueKeywords, pageNum, pageSize);
    }

    async function searchBlockByKeywords(
        keywords: string[],
        pageNum: number,
        pageSize: number,
    ) {
        if (!keywords || keywords.length <= 0) {
            searchResultDocumentCount = 0;
            // searchResultTotalCount = 0;
            curPage = 0;
            totalPage = 0;
            searchResults = [];
            return;
        }

        let types = ["d", "h", "c", "m", "t", "p", "html"];
        let pages = [pageNum, pageSize];

        isSearching++;
        let documentCountSql = generateDocumentCountSql(keywords, types);
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
            keywords,
            types,
            pages,
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
            let htmlContent = getHighlightedContent(block.content, keywords);
            let rootId = block.root_id;

            let documentItem = new DocumentSearchResultItem();
            documentItem.block = block;
            documentItem.subItems = [];
            documentItem.isCollapsed = true;
            documentItem.htmlContent = htmlContent;

            let curParentItem: DocumentSearchResultItem = null;
            if (documentBlockMap.has(rootId)) {
                curParentItem = documentBlockMap.get(rootId);
            } else {
                curParentItem = new DocumentSearchResultItem();
                curParentItem.subItems = [];
                documentBlockMap.set(rootId, curParentItem);
            }

            if (showChildDocument) {
                curParentItem.subItems.push(documentItem);
            } else if (block.type !== "d") {
                curParentItem.subItems.push(documentItem);
            }

            if (block.type === "d") {
                if (curParentItem.subItems) {
                    documentItem.subItems = curParentItem.subItems;
                }
                if (blocks.length > maxExpandCount) {
                    documentItem.isCollapsed = true;
                } else {
                    documentItem.isCollapsed = false;
                }
                if (block.ial) {
                    let ial = convertIalStringToObject(block.ial);
                    documentItem.icon = convertIconInIal(ial.icon);
                }
                searchResults.push(documentItem);
                documentBlockMap.set(rootId, documentItem);
            }
        }

        let index = 0;
        for (const item of searchResults) {
            item.index = index;
            for (const subItem of item.subItems) {
                index++;
                subItem.index = index;
            }
            index++;
        }
        searchResults = searchResults;
    }

    function getHighlightedContent(content: string, keywords: string[]) {
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

    function clickItem(block: Block) {
        console.log("search-home clickItem : ", block);
        let blockId = block.id;

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
                }, 200); // 设置一个合适的时间阈值
            } else if (itemClickCount === 2) {
                openBlockTab(blockId);
            }
        }
    }

    function openBlockTab(blockId: string) {
        let actions = [
            "cb-get-hl",
            "cb-get-focus",
            "cb-get-context",
            "cb-get-rootscroll",
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
        itemClickCount = 0; // 重置计数
    }

    function refreshBlockPreviewBox(blockId: string) {
        if (!showPreview) {
            return;
        }
        if (previewProtyle) {
            previewProtyle.destroy();
        }
        previewProtyle = new Protyle(app, previewDiv, {
            blockId: blockId,
            render: {
                gutter: true,
                breadcrumbDocName: true,
            },
            action: [
                "cb-get-hl",
                // "cb-get-focus",
                "cb-get-context",
                "cb-get-rootscroll",
            ],
        });
    }

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
</script>

<div class="b3-dialog__content" bind:this={element}>
    <div>
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
                id="searchPath"
                aria-label="指定路径"
                class="block__icon block__icon--show ariaLabel"
                data-position="9bottom"
            >
                <svg><use xlink:href="#iconFolder"></use></svg>
            </span>
            <span class="fn__space"></span>
            <span
                id="searchFilter"
                aria-label="类型"
                class="block__icon block__icon--show ariaLabel"
                data-position="9bottom"
            >
                <svg><use xlink:href="#iconFilter"></use></svg>
            </span>
        </div>
        <div
            class="b3-form__icon search__header"
            on:keydown={handleKeyDownSelectItem}
        >
            <div style="position: relative" class="fn__flex-1">
                <span
                    class="search__history-icon"
                    id="searchHistoryBtn"
                    on:click={searchHidtoryBtnClick}
                    on:keydown={handleKeyDownDefault}
                    aria-label="Alt+↓"
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
                        refreshSearch(searchInputKey, 1, defaultPageSize);
                    }}
                    on:keydown={handleKeyDownDefault}
                >
                    <use xlink:href="#iconCloseRound"></use>
                </svg>
            </div>
            <div class="block__icons">
                <span
                    id="searchRefresh"
                    aria-label="刷新"
                    class="block__icon ariaLabel"
                    data-position="9bottom"
                    on:click|stopPropagation={() => {
                        refreshSearch(searchInputKey, 1, defaultPageSize);
                    }}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg><use xlink:href="#iconRefresh"></use></svg>
                </span>

                <div class="fn__flex">
                    <span class="fn__space"></span>
                    <span
                        id="searchExpand"
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
                        id="searchCollapse"
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

        <div
            class="search__layout search__layout--row"
            style="height:{searchResultDivHeight}px;"
            on:keydown={handleKeyDownSelectItem}
        >
            {#if !hiddenSearchResult}
                <SearchResultItem
                    {searchResults}
                    {selectedIndex}
                    clickCallback={clickItem}
                    bind:this={searchResultItemComponent}
                />
            {/if}
            <div
                class="search__drag"
                on:mousedown={handleSearchDragMousdown}
            ></div>
            <div
                id="searchPreview"
                class="search__preview protyle fn__flex-1 {showPreview
                    ? ''
                    : 'fn__none'}"
                bind:this={previewDiv}
            ></div>
        </div>
    </div>
    <div
        class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}"
    >
        <!-- svelte-ignore a11y-missing-attribute -->
        <img width="120px" src="/stage/loading-pure.svg" />
    </div>
</div>

<style>
    .block__icon--show.block__icon.disabled {
        opacity: 0.38;
        cursor: not-allowed;
    }
</style>
