<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        openTab,
        openMobileFileById,
        ITab,
        Constants,
        TProtyleAction,
    } from "siyuan";
    import SearchResultItem from "@/components/search/search-result-item.svelte";

    import { SettingConfig } from "@/services/setting-config";
    import { openSettingsDialog } from "@/components/setting/setting-util";
    import { DocumentItem, DocumentSqlQueryModel } from "@/config/search-model";
    import { EnvConfig } from "@/config/env-config";
    import {
        getDocumentSearchResult,
        selectItemByArrowKeys,
        toggleAllCollpsedItem,
        highlightElementTextByCss,
        getOpenTabAction,
        delayedTwiceRefresh,
        clearCssHighlights,
        findScrollingElement,
    } from "@/components/search/search-util";

    // let element: HTMLElement;
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

    function clearDocumentSearchInput() {
        searchInputKey = "";
        refreshSearch(searchInputKey, 1);
        clearCssHighlights();
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

    function clickItem(event, item: DocumentItem) {
        let block = item.block;
        let blockId = block.id;
        selectedItemIndex = item.index;

        // documentSearchInputFocus();

        openBlockTab(blockId);
        event.stopPropagation();
        event.preventDefault();
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
            if (lastBlockId == blockId) {
                actions = actions.filter(
                    (item) => item !== Constants.CB_GET_HL,
                );
            }
            lastBlockId = blockId;

            let docTabPromise: Promise<ITab> = openTab({
                app: EnvConfig.ins.app,
                doc: {
                    id: blockId,
                    action: actions,
                },
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
        lastDocumentContentElement = docTab.panelElement
            .children[1] as HTMLElement;

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
            const matchElement =
                matchRange.commonAncestorContainer.parentElement;

            if (
                matchElement.clientHeight >
                document.documentElement.clientHeight
            ) {
                // 特殊情况：如果一个段落中软换行非常多，此时如果定位到匹配节点的首行，
                // 是看不到查询的文本的，需要通过 Range 的精确位置进行定位。
                const scrollingElement = findScrollingElement(matchElement);
                scrollingElement.scrollTo({
                    top:
                        scrollingElement.scrollTop +
                        matchRange.getBoundingClientRect().top,
                    behavior: "instant",
                });
            } else {
                matchElement.scrollIntoView({
                    behavior: "auto",
                    block: "nearest",
                });
            }
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

<div class="fn__flex-column" style="height: 100%;">
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
                on:click|stopPropagation={clearDocumentSearchInput}
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
