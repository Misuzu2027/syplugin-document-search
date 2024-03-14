<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        openTab,
        openMobileFileById,
        ITab,
        Constants,
        TProtyleAction,
    } from "siyuan";
    import SearchResultItem from "@/components/search/page/search-result-item.svelte";

    import { SettingConfig } from "@/services/setting-config";
    import { openSettingsDialog } from "../../setting/setting-util";
    import { DocumentItem, DocumentSqlQueryModel } from "@/config/search-model";
    import { EnvConfig } from "@/config/env-config";
    import {
        getDocumentSearchResult,
        selectItemByArrowKeys,
        toggleAllCollpsedItem,
        highlightElementTextByCss,
        getOpenTabAction,
        delayedTwiceRefresh,
    } from "./search-utils";

    let element: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;

    let searchInputKey: string = "";
    let documentItemSearchResult: DocumentItem[] = [];
    let selectedItemIndex: number = -1;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let hiddenSearchResult: boolean = false;
    let lastKeywords: string[];
    let searchResultDocumentCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;
    let previewProtyleMatchFocusIndex = 0;
    let lastBlockId: string;
    let lastDocumentContentElement: HTMLElement;

    onMount(async () => {
        resize();
    });

    onDestroy(() => {
        // showMessage("Hello panel closed");
    });

    export function resize(clientWidth?: number) {
        if (!document) {
            return;
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

    function handleKeyDownDefault() {}

    function handleKeyDownSelectItem(event: KeyboardEvent) {
        let selectedBlockItem = selectItemByArrowKeys(
            event,
            selectedItemIndex,
            documentItemSearchResult,
        );

        if (selectedBlockItem) {
            selectedItemIndex = selectedBlockItem.index;

            if (event.key === "Enter") {
                openBlockTab(selectedBlockItem.block.id);
            }
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

    async function refreshSearch(searchKey: string, pageNum: number) {
        isSearching++;
        let result: DocumentSqlQueryModel = await getDocumentSearchResult(
            searchKey,
            pageNum,
        );
        isSearching = Math.max(0, isSearching - 1);
        if (!result || result.status === "param_null") {
            searchResultDocumentCount = 0;
            curPage = 0;
            totalPage = 0;
            lastKeywords = [];
            documentItemSearchResult = [];
            return;
        }
        selectedItemIndex = -1;

        documentItemSearchResult = result.documentItems;
        lastKeywords = result.searchCriterion.keywords;

        initSearchDocumentCount();
        let documentCount: number = result.documentCount;
        let pageSize = SettingConfig.ins.pageSize;
        processSearchResultCount(documentCount, pageNum, pageSize);
    }

    // function refreshSearch1(searchKey: string, pageNum: number) {
    //     // 去除多余的空格，并将输入框的值按空格分割成数组
    //     const keywords = searchKey.trim().replace(/\s+/g, " ").split(" ");
    //
    //     // 过滤掉空的搜索条件并使用 Set 存储唯一的关键词
    //     const uniqueKeywordsSet = new Set(
    //         keywords.filter((keyword) => keyword.length > 0),
    //     );
    //
    //     // 将 Set 转换为数组
    //     let uniqueKeywords = Array.from(uniqueKeywordsSet);
    //
    //     searchBlockByKeywords(uniqueKeywords, pageNum);
    // }
    //
    // async function searchBlockByKeywords(keywords: string[], pageNum: number) {
    //     lastKeywords = keywords;
    //     if (!keywords || keywords.length <= 0) {
    //         searchResultDocumentCount = 0;
    //         // searchResultTotalCount = 0;
    //         curPage = 0;
    //         totalPage = 0;
    //         documentItemSearchResult = [];
    //         return;
    //     }
    //
    //     initSearchDocumentCount();
    //
    //     let pageSize = SettingConfig.ins.pageSize;
    //     let types = SettingConfig.ins.includeTypes;
    //     let queryFields = SettingConfig.ins.includeQueryFields;
    //     let excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;
    //     let pages = [pageNum, pageSize];
    //     let documentSortMethod = SettingConfig.ins.documentSortMethod;
    //     let contentBlockSortMethod = SettingConfig.ins.contentBlockSortMethod;
    //     selectedItemIndex = -1;
    //
    //     let documentSearchCriterion: DocumentQueryCriteria =
    //         new DocumentQueryCriteria(
    //             keywords,
    //             pages,
    //             documentSortMethod,
    //             contentBlockSortMethod,
    //             types,
    //             queryFields,
    //             excludeNotebookIds,
    //         );
    //
    //     isSearching++;
    //
    //     let documentSearchSql = generateDocumentSearchSql(
    //         documentSearchCriterion,
    //     );
    //     let documentSearchPromise: Promise<any[]> = query(documentSearchSql);
    //     documentSearchPromise
    //         .then((documentSearchResults: any[]) => {
    //             processSearchResults(
    //                 documentSearchResults,
    //                 documentSearchCriterion,
    //             ).then((_searchResults: DocumentItem[]) => {
    //                 documentItemSearchResult = _searchResults;
    //                 isSearching = Math.max(0, isSearching - 1);
    //             });
    //
    //             // 查询完内容后后再查询文档分页数量信息，可以防止并发降低主sql的查询速度。
    //             // refershSearchDocumentCount(documentSearchCriterion);
    //             /*
    //             暂时改为一个查询可以获取到文档数量，
    //                 缺点：数量字段每行都会有，增加了响应的体积。如果查询的块数量很多的话，速度回比上一个慢。
    //                 优点：前一种方式每次查询两个sql，输入关键字的过程中很大概率触发查询，这期间的查询还未结束的情况下，会影响最终查询，使用者只需要最终的查询结果，所以这一种方式更优。
    //             */
    //             let documentCount: number;
    //             if (documentSearchResults && documentSearchResults[0]) {
    //                 documentCount = documentSearchResults[0].documentCount;
    //                 processSearchResultCount(documentCount, pageNum, pageSize);
    //             }
    //         })
    //         .catch((error) => {
    //             console.error("Error:", error);
    //         });
    // }

    function initSearchDocumentCount() {
        searchResultDocumentCount = 0;
        curPage = 0;
        totalPage = 0;
    }

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

    function clickItem(item: DocumentItem) {
        let block = item.block;
        let blockId = block.id;
        selectedItemIndex = item.index;

        // documentSearchInputFocus();

        openBlockTab(blockId);
    }

    async function openBlockTab(blockId: string) {
        if (lastBlockId == blockId) {
            previewProtyleMatchFocusIndex++;
        } else {
            previewProtyleMatchFocusIndex = 0;
        }
        // lastBlockId = blockId;

        let actions: TProtyleAction[] = await getOpenTabAction(blockId);

        if (EnvConfig.ins.isMobile) {
            openMobileFileById(EnvConfig.ins.app, blockId, actions);
        } else {
            actions = actions.filter((item) => item !== Constants.CB_GET_HL);
            if (lastBlockId == blockId) {
                actions = [];
            }
            lastBlockId = blockId;

            let docTabPromise: Promise<ITab> = openTab({
                app: EnvConfig.ins.app,
                doc: {
                    id: blockId,
                    action: actions,
                },
                removeCurrentTab: true,
                afterOpen() {
                    afterOpenDocTab(docTabPromise, blockId);
                },
            });
        }
    }

    async function afterOpenDocTab(
        docTabPromise: Promise<ITab>,
        blockId: string,
    ) {
        let docTab = await docTabPromise;
        lastDocumentContentElement = docTab.panelElement.children[1]
            .children[2] as HTMLElement;

        delayedTwiceRefresh(() => {
            highlightElementTextByCss(
                lastDocumentContentElement,
                lastKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
                renderNextSearchMarkByRange,
            );
        }, 50);
    }

    function renderNextSearchMarkByRange(matchRange: Range) {
        if (matchRange) {
            const parent = matchRange.commonAncestorContainer.parentElement;
            parent.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    function clickExpandAll() {
        toggleAllCollpsedItem(documentItemSearchResult, false);
        documentItemSearchResult = documentItemSearchResult;
    }

    function clickCollapseAll() {
        toggleAllCollpsedItem(documentItemSearchResult, true);
        documentItemSearchResult = documentItemSearchResult;
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
    <div class="block__icons" style="overflow: auto">
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

        <span class="fn__flex-1" style="min-height: 100%"></span>
        <span class="fn__space"></span>

        <span
            id="documentSearchExpand"
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            aria-label="展开"
            on:click={clickExpandAll}
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
            on:click={clickCollapseAll}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconContract"></use></svg>
        </span>
    </div>
    <div
        class="b3-form__icon search__header"
        on:keydown={handleKeyDownSelectItem}
    >
        <div style="position: relative" class="fn__flex-1">
            <span>
                <svg data-menu="true" class="b3-form__icon-icon">
                    <use xlink:href="#iconSearch"></use>
                </svg>
                <!-- <svg class="search__arrowdown"
                    ><use xlink:href="#iconDown"></use>
                </svg> -->
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
        </div>
    </div>

    <div class="block__icons" style="overflow:auto">
        <span
            class="fn__flex-shrink ft__selectnone
        {searchResultDocumentCount == null || searchResultDocumentCount == 0
                ? 'fn__none'
                : ''}"
        >
            <span class="fn__space"></span>

            <span class="ft__on-surface">
                匹配到 {searchResultDocumentCount} 个文档
                <!-- 中匹配 {searchResultTotalCount}块 -->
            </span>
        </span>
        <span class="fn__space"></span>
        <span class="fn__flex-1" style="min-height: 100%"></span>

        <span
            class="fn__flex-shrink ft__selectnone
    {searchResultDocumentCount == null || searchResultDocumentCount == 0
                ? 'fn__none'
                : ''}"
        >
            {curPage}/{totalPage}
        </span>

        <span class="fn__space"></span>
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
    </div>
    <div class="search__layout search__layout--row">
        {#if !hiddenSearchResult}
            <SearchResultItem
                {documentItemSearchResult}
                selectedIndex={selectedItemIndex}
                clickCallback={clickItem}
            />
        {/if}
    </div>
</div>
<div class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img width="120px" src="/stage/loading-pure.svg" />
</div>
