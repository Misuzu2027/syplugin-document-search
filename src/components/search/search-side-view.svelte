<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        openTab,
        openMobileFileById,
        ITab,
        TProtyleAction,
        Constants,
        showMessage,
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
        delayedTwiceRefresh,
        clearCssHighlights,
        findScrollingElement,
        getOpenTabActionByZoomIn,
        getDocumentQueryCriteria,
        bgFade,
        getNotebookMap,
    } from "@/components/search/search-util";
    import { getBlockIsFolded } from "@/utils/api";

    // let element: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;

    let searchInputKey: string = "";
    let documentItemSearchResult: DocumentItem[] = [];
    let selectedItemIndex: number = -1;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let hiddenDock: boolean = true;
    let lastKeywords: string[];
    let searchResultDocumentCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;
    let previewProtyleMatchFocusIndex = 0;
    let lastBlockId: string;
    let lastDocumentContentElement: HTMLElement;
    let isSearchInCurrentDoc: boolean = false;
    let notebookMap: Map<string, Notebook> = new Map();
    let specifiedNotebookId: string = "";

    onMount(async () => {
        if (EnvConfig.ins.isMobile) {
            hiddenDock = false;
        }
        resize();
    });

    onDestroy(() => {
        // showMessage("Hello panel closed");
    });

    export function resize(clientWidth?: number) {
        if (!document) {
            return;
        }
        if (clientWidth != undefined && clientWidth != null) {
            let lastHiddenSearchResult = hiddenDock;
            if (clientWidth == 0) {
                hiddenDock = true;
            } else {
                hiddenDock = false;
            }
            if (!hiddenDock && lastHiddenSearchResult) {
                documentSearchInputFocus();
            }
            if (hiddenDock) {
                // 隐藏侧边栏，清空高亮
                clearCssHighlights();
            }
        }

        refreshData();
    }

    async function refreshData() {
        notebookMap.clear();
        notebookMap = await getNotebookMap();
    }

    function documentSearchInputFocus() {
        if (!documentSearchInputElement) {
            return;
        }
        documentSearchInputElement.select();
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
                let block = selectedBlockItem.block;
                openBlockTab(block.id, block.root_id);
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
        // 每次查询改为2，防止因为异常，加载图案不会消失。目前获取到查询-1，处理完搜索结果-1。
        isSearching = 2;
        let includeNotebookIds = [];
        if (specifiedNotebookId) {
            includeNotebookIds.push(specifiedNotebookId);
        }
        let documentQueryCriteria = getDocumentQueryCriteria(
            searchKey,
            includeNotebookIds,
            pageNum,
        );
        if (documentQueryCriteria) {
            if (isSearchInCurrentDoc && EnvConfig.ins.lastViewedDocId) {
                // 使用在当前文档搜索的时候，强制修改排序方式为原文排序
                documentQueryCriteria.includeRootIds = [
                    EnvConfig.ins.lastViewedDocId,
                ];
                // 原文排序
                documentQueryCriteria.contentBlockSortMethod = "content";
            }
        }
        let result: DocumentSqlQueryModel = await getDocumentSearchResult(
            documentQueryCriteria,
        );
        isSearching = Math.max(0, isSearching - 1);
        if (!result || result.status === "param_null") {
            searchResultDocumentCount = 0;
            curPage = 0;
            totalPage = 0;
            lastKeywords = [];
            documentItemSearchResult = [];
            isSearching = 0;
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
        let rootId = block.root_id;
        selectedItemIndex = item.index;

        // documentSearchInputFocus();

        openBlockTab(blockId, rootId);
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    async function openBlockTab(blockId: string, rootId: string) {
        if (lastBlockId == blockId) {
            previewProtyleMatchFocusIndex++;
        } else {
            previewProtyleMatchFocusIndex = 0;
        }

        let zoomIn = await getBlockIsFolded(blockId);
        let actions: TProtyleAction[] = getOpenTabActionByZoomIn(zoomIn);

        if (EnvConfig.ins.isMobile) {
            openMobileFileById(EnvConfig.ins.app, blockId, actions);
        } else {
            openDestopBlockTab(zoomIn, actions, blockId, rootId);
        }
    }

    async function openDestopBlockTab(
        zoomIn: boolean,
        actions: TProtyleAction[],
        blockId: string,
        rootId: string,
    ) {
        if (rootId == blockId) {
            // actions = actions.filter((item) => item !== Constants.CB_GET_HL);
            actions = [Constants.CB_GET_FOCUS, Constants.CB_GET_SCROLL];
        }
        lastBlockId = blockId;

        // 如果被查找节点不是聚焦状态，节点文档是当前查看文档，节点的文档element 存在，文档element 保护查找的节点
        if (
            !zoomIn &&
            rootId != blockId &&
            rootId == EnvConfig.ins.lastViewedDocId &&
            lastDocumentContentElement &&
            document.contains(lastDocumentContentElement)
        ) {
            let targetNodeElement: Element | null =
                lastDocumentContentElement.querySelector(
                    `[data-node-id="${blockId}"]`,
                );
            if (targetNodeElement) {
                highlightElementTextByCss(
                    lastDocumentContentElement,
                    lastKeywords,
                    blockId,
                    previewProtyleMatchFocusIndex,
                    renderNextSearchMarkByRange,
                );

                bgFade(targetNodeElement);
                return;
            }
        }

        let docTabPromise: Promise<ITab> = openTab({
            app: EnvConfig.ins.app,
            doc: {
                id: blockId,
                action: actions,
            },
            afterOpen() {
                let tmpBlockId = "";
                if (rootId != blockId) {
                    tmpBlockId = blockId;
                }
                afterOpenDocTab(docTabPromise, tmpBlockId);
            },
        });
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
                renderFirstSearchMarkByRange,
            );
        }, 50);
    }

    function renderFirstSearchMarkByRange(matchRange: Range) {
        scrollByRange(matchRange, "nearest");
    }

    function renderNextSearchMarkByRange(matchRange: Range) {
        scrollByRange(matchRange, "center");
    }

    function scrollByRange(matchRange: Range, position: ScrollLogicalPosition) {
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
                const contentRect = scrollingElement.getBoundingClientRect();
                let scrollTop =
                    scrollingElement.scrollTop +
                    matchRange.getBoundingClientRect().top -
                    contentRect.top -
                    contentRect.height / 2;
                scrollingElement.scrollTo({
                    top: scrollTop,
                    behavior: "smooth",
                });
            } else {
                matchElement.scrollIntoView({
                    behavior: "smooth",
                    block: position,
                    inline: position,
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

    function changeCheckboxSearchInCurrentDoc(event) {
        if (event.target.checked && !EnvConfig.ins.lastViewedDocId) {
            showMessage(
                EnvConfig.ins.i18n.switchCurrentDocumentSearchFailureMessage,
                4000,
                "info",
            );
            event.target.checked = false;
        }
        isSearchInCurrentDoc = event.target.checked;
        refreshSearch(searchInputKey, 1);
    }

    function specifiedNotebookIdChange(event) {
        specifiedNotebookId = event.target.value;
        refreshSearch(searchInputKey, 1);
    }
</script>

<div class="fn__flex-column" style="height: 100%;">
    <div class="block__icons" style="overflow: auto">
        <span class="fn__space"></span>
        <span
            id="documentSearchNotebookFilter"
            aria-label={EnvConfig.ins.i18n.notebookFilter}
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
            aria-label={EnvConfig.ins.i18n.type}
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
            aria-label={EnvConfig.ins.i18n.attr}
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
            aria-label={EnvConfig.ins.i18n.other}
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
            aria-label={EnvConfig.ins.i18n.expand}
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
            aria-label={EnvConfig.ins.i18n.collapse}
            on:click={clickCollapseAll}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconContract"></use></svg>
        </span>
    </div>
    <div class="block__icons" style="overflow: auto">
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center ariaLabel"
            style="max-width: 160px;"
            aria-label={EnvConfig.ins.i18n.specifyNotebook}
            on:change={specifiedNotebookIdChange}
            disabled={isSearchInCurrentDoc}
        >
            <option value=""> 🌐 {EnvConfig.ins.i18n.allNotebooks} </option>
            {#each Array.from(notebookMap.entries()) as [key, item] (key)}
                <option
                    value={item.id}
                    selected={item.id == specifiedNotebookId}
                >
                    {#if item.icon}
                        {@html item.icon}
                    {:else}
                        🗃
                    {/if}
                    {item.name}
                </option>
            {/each}
        </select>
        <span class="fn__space"></span>
        <span>
            <input
                class="b3-switch fn__flex-center ariaLabel"
                type="checkbox"
                aria-label={EnvConfig.ins.i18n.searchInTheCurrentDocument}
                on:change={changeCheckboxSearchInCurrentDoc}
            />
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
                aria-label={EnvConfig.ins.i18n.clear}
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
                aria-label={EnvConfig.ins.i18n.refresh}
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
                {EnvConfig.ins.i18n.findInDoc.replace(
                    "${x}",
                    searchResultDocumentCount,
                )}
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
            aria-label={EnvConfig.ins.i18n.previousLabel}
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
            aria-label={EnvConfig.ins.i18n.nextLabel}
            on:click={() => {
                pageTurning(curPage + 1);
            }}
            on:keydown={handleKeyDownDefault}
            ><svg><use xlink:href="#iconRight"></use></svg></span
        >

        <span class="fn__space"></span>
    </div>
    <div class="search__layout search__layout--row">
        {#if !hiddenDock}
            <SearchResultItem
                {documentItemSearchResult}
                selectedIndex={selectedItemIndex}
                clickCallback={clickItem}
            />
        {/if}
    </div>
</div>
<div
    class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}"
    style="top:85px"
>
    <!-- svelte-ignore a11y-missing-attribute -->
    <img width="120px" src="/stage/loading-pure.svg" />
</div>

<style>
</style>
