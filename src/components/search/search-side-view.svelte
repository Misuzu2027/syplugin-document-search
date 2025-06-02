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
    import {
        BlockItem,
        DocumentItem,
        DocumentSqlQueryModel,
    } from "@/config/search-model";
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
        getRangeByElement,
    } from "@/components/search/search-util";
    import { getBlockIsFolded, getNotebookMapByApi } from "@/utils/api";
    import { isElementHidden } from "@/utils/html-util";
    import { isStrNotBlank } from "@/utils/string-util";

    let rootElement: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;

    let searchInputKey: string = "";
    let documentItemSearchResult: DocumentItem[] = [];
    let selectedItemIndex: number = -1;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let hiddenDock: boolean = true;
    let includeKeywords: string[];
    let searchResultDocumentCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;
    let previewProtyleMatchFocusIndex = 0;
    let lastBlockId: string;
    let lastDocumentContentElement: HTMLElement;
    let isSearchInCurrentDoc: boolean = false;
    let notebookMap: Map<string, Notebook> = new Map();
    // let specifiedNotebookId: string = "";
    let docFullTextSearch: boolean = true;

    onMount(async () => {
        resize();
    });

    onDestroy(() => {
        // showMessage("Hello panel closed");
    });

    export function resize(clientWidth?: number) {
        if (!document) {
            return clientWidth;
        }

        refreshData();
        restView();
    }

    function restView() {
        let hiddenDockTemp = hiddenDock;
        hiddenDock = isElementHidden(rootElement);
        if (hiddenDockTemp && !hiddenDock) {
            documentSearchInputFocus();
        }
        if (hiddenDock) {
            // 隐藏侧边栏，清空高亮
            clearCssHighlights();
        }
    }

    async function refreshData() {
        notebookMap.clear();
        notebookMap = await getNotebookMapByApi(false);
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
        let keydownKey = event.key;

        if (event.altKey && keydownKey === "r") {
            event.preventDefault();
            event.stopPropagation();

            docFullTextSearchChange();
        } else if (event.ctrlKey && keydownKey == "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            clickCollapseAll();
            return;
        } else if (event.ctrlKey && keydownKey == "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            clickExpandAll();
            return;
        } else if (event.altKey && keydownKey == "ArrowLeft") {
            event.preventDefault();
            event.stopPropagation();
            pageTurning(curPage - 1);
            return;
        } else if (event.altKey && keydownKey == "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            pageTurning(curPage + 1);
            return;
        }

        let selectedBlockItem = selectItemByArrowKeys(
            event,
            selectedItemIndex,
            documentItemSearchResult,
        );

        if (selectedBlockItem) {
            documentSearchInputElement.focus();

            selectedItemIndex = selectedBlockItem.index;
            expandSelectedItemDocument(selectedBlockItem);
            scrollToSelectedBlock(selectedBlockItem);

            if (keydownKey === "Enter") {
                let block = selectedBlockItem.block;
                openBlockTab(block.id, block.root_id);
            }
        }
    }

    function expandSelectedItemDocument(
        selectedItem: DocumentItem | BlockItem,
    ) {
        if (!selectedItem || !documentItemSearchResult) {
            return;
        }
        for (const item of documentItemSearchResult) {
            if (!item.isCollapsed) {
                continue;
            }
            // if (item == selectedItem) {
            //     item.isCollapsed = false;
            //     return;
            // }
            for (const subItem of item.subItems) {
                if (subItem != item && subItem == selectedItem) {
                    item.isCollapsed = false;
                    
                    // 响应式有延迟，需要自己修改一下类样式。。。
                    let itemElements = rootElement.querySelectorAll(
                        `div[data-type="search-item"][data-root-id="${selectedItem.block.root_id}"]`,
                    );
                    itemElements.forEach((element) => {
                        element.classList.remove("fn__none");
                    });
                    return;
                }
            }
        }
    }

    function scrollToSelectedBlock(selectedItem: DocumentItem | BlockItem) {
        if (!selectedItem) {
            return;
        }
        let searchResultListElement = rootElement.querySelector(
            "#documentSearchList",
        ) as HTMLElement;

        let focusItem = rootElement.querySelector(
            `div[data-type="search-item"][data-node-id="${selectedItem.block.id}"]`,
        ) as HTMLElement;

        if (!focusItem || focusItem.classList.contains("fn__none")) {
            focusItem = rootElement.querySelector(
                `div.b3-list-item[data-node-id="${selectedItem.block.id}"]`,
            ) as HTMLElement;
        }

        if (!searchResultListElement || !focusItem) {
            return;
        }

        let scrollTop =
            focusItem.offsetTop - searchResultListElement.clientHeight / 2;
        if (focusItem.offsetTop > scrollTop) {
            searchResultListElement.scrollTop = scrollTop;
        } else {
            searchResultListElement.scrollTop = 0;
        }
    }

    function handleSearchInputChange(event) {
        let inputValue = event.target.value as string;

        if (
            isStrNotBlank(searchInputKey) &&
            isStrNotBlank(inputValue) &&
            searchInputKey.trim() == inputValue.trim()
        ) {
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

    function handleSearchInputKeydown(event) {
        // 检测回车键
        // console.log("handleSearchInputKeydown event.key ", event.key);
        if (event.key === "Enter" || event.keyCode === 13) {
            event.preventDefault();

            refreshSearch(searchInputKey, 1);
        }
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
        // let includeNotebookIds = [];
        // if (specifiedNotebookId) {
        // includeNotebookIds.push(specifiedNotebookId);
        // }
        let documentQueryCriteria = getDocumentQueryCriteria(
            searchKey,
            docFullTextSearch,
            // includeNotebookIds,
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
            includeKeywords = [];
            documentItemSearchResult = [];
            isSearching = 0;
            return;
        }
        selectedItemIndex = -1;

        documentItemSearchResult = result.documentItems;
        includeKeywords = result.searchCriterion.includeKeywords;

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
            // rootId != blockId &&
            rootId == EnvConfig.ins.lastViewedDocId &&
            lastDocumentContentElement &&
            document.contains(lastDocumentContentElement)
        ) {
            let targetNodeElement: Element | null =
                lastDocumentContentElement.querySelector(
                    `[data-node-id="${blockId}"]`,
                );
            if (targetNodeElement) {
                let matchBlockId = rootId == blockId ? null : blockId;
                let matchFocusRangePromise = highlightElementTextByCss(
                    lastDocumentContentElement,
                    includeKeywords,
                    matchBlockId,
                    previewProtyleMatchFocusIndex,
                );

                matchFocusRangePromise.then((focusRange) => {
                    if (!focusRange) {
                        focusRange = getRangeByElement(targetNodeElement);
                    }

                    renderNextSearchMarkByRange(focusRange);
                });

                if (matchBlockId) {
                    bgFade(targetNodeElement);
                }
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
        lastDocumentContentElement = docTab.panelElement.querySelector(
            "div.protyle-content",
        ) as HTMLElement;

        delayedTwiceRefresh(() => {
            let matchFocusRangePromise = highlightElementTextByCss(
                lastDocumentContentElement,
                includeKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
            );

            matchFocusRangePromise.then((focusRange) => {
                renderFirstSearchMarkByRange(focusRange);
            });
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

    // function clickSearchAttrFilter() {
    //     openSettingsDialog("settingAttr");
    // }

    function clickSearchSettingOther() {
        openSettingsDialog("settingOther");
    }

    function changeCheckboxSearchInCurrentDoc(event) {
        if (!isSearchInCurrentDoc && !EnvConfig.ins.lastViewedDocId) {
            showMessage(
                EnvConfig.ins.i18n.switchCurrentDocumentSearchFailureMessage,
                4000,
                "info",
            );
            event.target.checked = false;
        }
        isSearchInCurrentDoc = !isSearchInCurrentDoc;
        refreshSearch(searchInputKey, 1);
    }

    // function specifiedNotebookIdChange(event) {
    // specifiedNotebookId = event.target.value;
    // refreshSearch(searchInputKey, 1);
    // }

    function docFullTextSearchChange() {
        docFullTextSearch = !docFullTextSearch;
        refreshSearch(searchInputKey, 1);
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore missing-declaration -->
<!-- svelte-ignore a11y-label-has-associated-control -->
<div
    class="fn__flex-column document-search-plugin__area"
    style="height: 100%;"
    bind:this={rootElement}
>
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
            id="documentSearchSettingOther"
            aria-label={EnvConfig.ins.i18n.other}
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchSettingOther}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconSearchSettingOther"></use></svg>
        </span>
        <span class="fn__space"></span>
        <span
            id="documentSearchCurDoc"
            aria-label={EnvConfig.ins.i18n.searchInTheCurrentDocument}
            class="block__icon ariaLabel {isSearchInCurrentDoc
                ? 'label-selected'
                : ''}"
            style="opacity: 1;"
            on:click={changeCheckboxSearchInCurrentDoc}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconCurDocSearch"></use></svg>
        </span>
        <span class="fn__space"></span>
        <span
            class="block__icon ariaLabel {docFullTextSearch
                ? 'label-selected'
                : ''}"
            aria-label="全文搜索"
            style="opacity: 1;"
            on:click={docFullTextSearchChange}
            on:keydown={handleKeyDownDefault}
        >
            <svg class="ft__on-surface svg fn__flex-center"
                ><use xlink:href="#iconFullTextSearch"></use></svg
            >
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
                on:keydown={handleSearchInputKeydown}
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
                    String(searchResultDocumentCount),
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
    {#if !hiddenDock}
        <div class="search__layout search__layout--row">
            <SearchResultItem
                {documentItemSearchResult}
                selectedIndex={selectedItemIndex}
                clickCallback={clickItem}
            />
        </div>
    {/if}
</div>
<div
    class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}"
    style="top:125px"
>
    <!-- svelte-ignore a11y-missing-attribute -->
    <img width="120px" src="/stage/loading-pure.svg" />
</div>

<style lang="scss">
    .label-selected {
        // border: 1px solid #66ccff; rgba(102, 204, 255, 0.5)
        // box-shadow: inset 0 0 5px 2px var(--b3-theme-primary-light);
        background-color: var(--b3-theme-primary-light);
        transition: box-shadow 0.5s ease-in-out;
    }
</style>
