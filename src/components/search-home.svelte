<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { lsNotebooks, sql as query } from "@/utils/api";
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
        Dialog,
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

    let previewDiv: HTMLDivElement;
    let previewProtyle: Protyle;
    let searchInputKey: string = "";
    let searchResults: DocumentSearchResultItem[] = [];
    let selectedIndex: number = 0;
    let itemClickCount = 0;
    let searchResultDivHeight: number;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let hiddenSearchResult: boolean = false;
    let searchResultDocumentCount: number = null;
    // let searchResultTotalCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;
    let notebookMap: Map<string, Notebook> = new Map();

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
        let minHeight = 210;
        if (!showPreview) {
            minHeight = 172;
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

        isSearching++;
        let documentCountSql = generateDocumentCountSql(
            keywords,
            types,
            queryFields,
            excludeNotebookIds,
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
            keywords,
            pages,
            types,
            queryFields,
            excludeNotebookIds,
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
            // documentItem.block.content = contentHtml;

            let curParentItem: DocumentSearchResultItem = null;
            if (documentBlockMap.has(rootId)) {
                curParentItem = documentBlockMap.get(rootId);
            } else {
                curParentItem = new DocumentSearchResultItem();
                curParentItem.subItems = [];
                documentBlockMap.set(rootId, curParentItem);
            }

            if (SettingConfig.ins.showChildDocument) {
                curParentItem.subItems.push(documentItem);
            } else if (block.type !== "d") {
                curParentItem.subItems.push(documentItem);
            }

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
            // previewProtyle.destroy();
        }
        previewProtyle = new Protyle(app, previewDiv, {
            blockId: blockId,
            render: {
                gutter: true,
                breadcrumbDocName: true,
            },
            action: [
                "cb-get-hl",
                "cb-get-focus",
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

    async function updateNotebookMap() {
        let notebooks: Notebook[] = (await lsNotebooks()).notebooks;
        for (const notebook of notebooks) {
            notebookMap.set(notebook.id, notebook);
        }
    }

    function clickSearchNotebookFilter() {
        let dialog = new Dialog({
            title: "笔记本",
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

<div
    class="fn__flex-column"
    style="height: 100%; width:calc(100% - 7px);"
    bind:this={element}
>
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
            id="searchNotebookFilter"
            aria-label="笔记本"
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchNotebookFilter}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconFolder"></use></svg>
        </span>
        <span class="fn__space"></span>
        <span
            id="searchTypeFilter"
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
            id="searchAttrFilter"
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
            id="searchSettingOther"
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
                    refreshSearch(searchInputKey, 1);
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
                    refreshSearch(searchInputKey, curPage);
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
        on:keydown={handleKeyDownSelectItem}
    >
        {#if !hiddenSearchResult}
            <SearchResultItem
                {searchResults}
                {selectedIndex}
                clickCallback={clickItem}
                {searchResultDivHeight}
            />
        {/if}
        <div class="search__drag" on:mousedown={handleSearchDragMousdown}></div>
        <div
            id="searchPreview"
            class="search__preview protyle fn__flex-1 {showPreview
                ? ''
                : 'fn__none'}"
            bind:this={previewDiv}
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
</style>
