<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { checkBlockFold, sql as query } from "@/utils/api";
    import {
        DocumentQueryCriteria,
        generateDocumentSearchSql,
    } from "@/services/search-sql";
    import {
        // showMessage,
        Protyle,
        openTab,
        openMobileFileById,
        Constants,
        TProtyleAction,
    } from "siyuan";
    import SearchResultItem from "@/components/search/search-result-item.svelte";

    import { SettingConfig } from "@/services/setting-config";
    import { openSettingsDialog } from "../../setting/setting-util";
    import { DocumentSearchResultItem } from "@/config/search-model";
    import { EnvConfig } from "@/config/env-config";
    import {
        getNodeId,
        handleSearchDragMousdown,
        processSearchResults,
    } from "./search-utils";

    export let showPreview;

    let element: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;

    let previewDivElement: HTMLDivElement;
    let previewProtyle: Protyle;
    let previewProtyleMatchFocusIndex: number;
    let searchInputKey: string = "";
    let searchResults: DocumentSearchResultItem[] = [];
    let selectedItemIndex: number = -1;
    let itemClickCount = 0;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let hiddenSearchResult: boolean = false;
    let lastKeywords: string[];
    let searchResultDocumentCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;

    onMount(async () => {
        previewProtyle = new Protyle(EnvConfig.ins.app, previewDivElement, {
            blockId: "",
            render: {
                gutter: true,
                breadcrumbDocName: true,
            },
        });
        resize();
    });

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
        documentSearchInputFocus();

        if (clientWidth) {
            if (clientWidth == 0) {
                hiddenSearchResult = true;
            } else {
                hiddenSearchResult = false;
            }
        }
    }

    function documentSearchInputFocus() {
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
            if (selectedItemIndex > 0) {
                selectedItemIndex -= 1;
            }
        } else if (event.key === "ArrowDown") {
            let lastSubItems = searchResults[searchResults.length - 1].subItems;
            let lastIndex = searchResults[searchResults.length - 1].index;
            if (lastSubItems && lastSubItems.length > 0) {
                lastIndex = lastSubItems[lastSubItems.length - 1].index;
            }
            if (selectedItemIndex < lastIndex) {
                selectedItemIndex += 1;
            }
        }
        for (const item of searchResults) {
            if (selectedItemIndex == item.index) {
                selectedItem = item;
                break;
            }
            for (const subItem of item.subItems) {
                if (selectedItemIndex == subItem.index) {
                    selectedItem = subItem;
                    break;
                }
            }
        }

        if (!selectedItem) {
            return;
        }
        // refreshBlockPreviewBox(selectedItem.block.id);
        documentSearchInputFocus();

        if (event.key === "Enter") {
            openBlockTab(selectedItem.block.id);
        }
    }

    function handleSearchInputChange(event) {
        let inputValue = event.target.value;
        if (searchInputKey == inputValue) {
            return;
        }

        // 更新输入值
        searchInputKey = inputValue;
        // 清除之前的定时器
        clearTimeout(inputChangeTimeoutId);

        inputChangeTimeoutId = setTimeout(() => {
            refreshSearch(inputValue, 1);
        }, 450);
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

        initSearchDocumentCount();

        let pageSize = SettingConfig.ins.pageSize;
        let types = SettingConfig.ins.includeTypes;
        let queryFields = SettingConfig.ins.includeQueryFields;
        let excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;
        let pages = [pageNum, pageSize];
        let documentSortMethod = SettingConfig.ins.documentSortMethod;
        let contentBlockSortMethod = SettingConfig.ins.contentBlockSortMethod;
        selectedItemIndex = -1;

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

        let documentSearchSql = generateDocumentSearchSql(
            documentSearchCriterion,
        );
        let documentSearchPromise: Promise<any[]> = query(documentSearchSql);
        documentSearchPromise
            .then((documentSearchResults: any[]) => {
                processSearchResults(
                    documentSearchResults,
                    documentSearchCriterion,
                ).then((_searchResults: DocumentSearchResultItem[]) => {
                    searchResults = _searchResults;
                    isSearching = Math.max(0, isSearching - 1);
                });

                // 查询完内容后后再查询文档分页数量信息，可以防止并发降低主sql的查询速度。
                // refershSearchDocumentCount(documentSearchCriterion);
                /*
                暂时改为一个查询可以获取到文档数量，
                    缺点：数量字段每行都会有，增加了响应的体积。如果查询的块数量很多的话，速度回比上一个慢。
                    优点：前一种方式每次查询两个sql，输入关键字的过程中很大概率触发查询，这期间的查询还未结束的情况下，会影响最终查询，使用者只需要最终的查询结果，所以这一种方式更优。
                */
                let documentCount: number;
                if (documentSearchResults && documentSearchResults[0]) {
                    documentCount = documentSearchResults[0].documentCount;
                    processSearchResultCount(documentCount, pageNum, pageSize);
                }
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    function initSearchDocumentCount() {
        searchResultDocumentCount = 0;
        curPage = 0;
        totalPage = 0;
    }

    // function refershSearchDocumentCount(
    //     documentSearchCriterion: DocumentQueryCriteria,
    // ) {
    //     let documentCountSql = generateDocumentCountSql(
    //         documentSearchCriterion,
    //     );
    //     let pageNum = documentSearchCriterion.pages[0];
    //     let pageSize = documentSearchCriterion.pages[1];

    //     let queryDocumentCountPromise: Promise<any[]> = query(documentCountSql);
    //     queryDocumentCountPromise
    //         .then((documentCountResults: any[]) => {
    //             processSearchResultCount(
    //                 documentCountResults.length,
    //                 pageNum,
    //                 pageSize,
    //             );
    //         })
    //         .catch((error) => {
    //             console.error("Error:", error);
    //         });
    // }

    function processSearchResultCount(
        documentCount: number,
        pageNum: number,
        pageSize: number,
    ) {
        isSearching = Math.max(0, isSearching - 1);
        if (documentCount && documentCount > 0) {
            searchResultDocumentCount = documentCount;
            curPage = pageNum;
            totalPage = Math.ceil(searchResultDocumentCount / pageSize);
        }
    }

    function clickItem(item: DocumentSearchResultItem) {
        let block = item.block;
        let blockId = block.id;
        selectedItemIndex = item.index;
        let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;

        documentSearchInputFocus();

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
                if (EnvConfig.ins.isMobile) {
                    openMobileFileById(EnvConfig.ins.app, blockId, actions);
                } else {
                    openTab({
                        app: EnvConfig.ins.app,
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

        if (previewProtyle.protyle.block.id == blockId) {
            previewProtyleMatchFocusIndex++;

            protyleHighlight(
                previewProtyle.protyle.contentElement,
                lastKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
            );
            return;
        }
        previewProtyleMatchFocusIndex = 0;

        checkBlockFold(blockId)
            .then((zoomIn: boolean) => {
                let actions: TProtyleAction[] = zoomIn
                    ? [Constants.CB_GET_HL, Constants.CB_GET_ALL]
                    : [
                          Constants.CB_GET_HL,
                          Constants.CB_GET_CONTEXT,
                          Constants.CB_GET_ROOTSCROLL,
                      ];

                previewProtyle = new Protyle(
                    EnvConfig.ins.app,
                    previewDivElement,
                    {
                        blockId: blockId,
                        render: {
                            gutter: true,
                            breadcrumbDocName: true,
                        },
                        action: actions,
                        after: (protyle: Protyle) => {
                            let protyleContentElement =
                                protyle.protyle.contentElement;
                            protyleHighlight(
                                protyleContentElement,
                                lastKeywords,
                                blockId,
                                previewProtyleMatchFocusIndex,
                            );
                            // 延迟刷新一次，目前用于代码块、数据库块内容高亮
                            let refreshPreviewHighlightTimeout =
                                SettingConfig.ins
                                    .refreshPreviewHighlightTimeout;
                            if (
                                refreshPreviewHighlightTimeout &&
                                refreshPreviewHighlightTimeout > 0
                            ) {
                                setTimeout(() => {
                                    // const startTime = new Date().getTime();

                                    protyleHighlight(
                                        protyleContentElement,
                                        lastKeywords,
                                        blockId,
                                        previewProtyleMatchFocusIndex,
                                    );
                                    // const endTime = new Date().getTime();
                                    // console.log(
                                    //     "高亮执行消耗的时间（毫秒）:",
                                    //     endTime - startTime,
                                    // );
                                }, refreshPreviewHighlightTimeout);
                            }
                        },
                    },
                );
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    async function protyleHighlight(
        contentElement: HTMLElement,
        keywords: string[],
        targetBlockId: string,
        nextMatchFocusIndex: number,
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

        let allMatchRanges: Range[] = [];
        let targetElementMatchRanges: Range[] = [];

        // Iterate over all text nodes and find matches.
        allTextNodes
            .map((el: Node) => {
                return { el, text: el.textContent.toLowerCase() };
            })
            .map(({ el, text }) => {
                const indices: { index: number; length: number }[] = [];
                for (const queryStr of keywords) {
                    if (!queryStr) {
                        continue;
                    }
                    let startPos = 0;
                    while (startPos < text.length) {
                        const index = text.indexOf(
                            queryStr.toLowerCase(),
                            startPos,
                        );
                        if (index === -1) break;
                        let length = queryStr.length;
                        indices.push({ index, length });
                        startPos = index + length;
                    }
                }

                indices
                    .sort((a, b) => a.index - b.index)
                    .map(({ index, length }) => {
                        const range = new Range();
                        range.setStart(el, index);
                        range.setEnd(el, index + length);
                        allMatchRanges.push(range);
                        if (getNodeId(el) == targetBlockId) {
                            targetElementMatchRanges.push(range);
                        }
                    });
            });

        // Create a Highlight object for the ranges.
        allMatchRanges = allMatchRanges.flat();
        if (!allMatchRanges || allMatchRanges.length <= 0) {
            return;
        }
        let matchFocusRange: Range;
        let nextMatchIndexRemainder =
            nextMatchFocusIndex % targetElementMatchRanges.length;
        for (let i = 0; i < targetElementMatchRanges.length; i++) {
            if (i == nextMatchIndexRemainder) {
                matchFocusRange = targetElementMatchRanges[i];
                break;
            }
        }
        if (!matchFocusRange) {
            previewProtyleMatchFocusIndex = 0;
            matchFocusRange = targetElementMatchRanges[0];
        }
        allMatchRanges = allMatchRanges.filter(
            (obj) => obj !== matchFocusRange,
        );

        const searchResultsHighlight = new Highlight(...allMatchRanges);

        // Register the Highlight object in the registry.
        CSS.highlights.set("search-result-mark", searchResultsHighlight);

        renderNextSearchMarkByRange(previewProtyle, matchFocusRange);
    }

    function renderNextSearchMarkByRange(edit: Protyle, matchRange: Range) {
        if (matchRange) {
            // matchElement.classList.add("search-mark--hl");
            const protyleElement = edit.protyle.contentElement;
            const contentRect = protyleElement.getBoundingClientRect();
            protyleElement.scrollTop =
                protyleElement.scrollTop +
                matchRange.getBoundingClientRect().top -
                contentRect.top -
                contentRect.height / 2;

            CSS.highlights.set(
                "search-result-focus",
                new Highlight(matchRange),
            );
        }
    }

    function toggleAllCollpsedItem(isCollapsed: boolean) {
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

    function clickSearchNotebookFilter() {
        openSettingsDialog("settingNotebook");
    }

    function clickSearchTypeFilter() {
        openSettingsDialog("settingType");
    }

    function clickSearchAttrFilter() {
        openSettingsDialog("settingAttr");
    }

    function clickSearchSettingOther() {
        openSettingsDialog("settingOther");
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
                selectedIndex={selectedItemIndex}
                clickCallback={clickItem}
            />
        {/if}
        
        {#if showPreview}
            <div
                class="search__drag"
                on:mousedown={handleSearchDragMousdown}
            ></div>
            <div
                id="documentSearchPreview"
                class="search__preview"
                bind:this={previewDivElement}
            ></div>
        {/if}
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

    ::highlight(search-result-focus) {
        background-color: var(--b3-theme-primary-lighter);
        color: var(--b3-protyle-inline-mark-color);
    }
</style>
