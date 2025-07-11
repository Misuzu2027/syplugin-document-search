<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        Protyle,
        openTab,
        openMobileFileById,
        TProtyleAction,
        Custom,
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
        selectItemByArrowKeys,
        highlightElementTextByCss,
        toggleAllCollpsedItem,
        getOpenTabAction,
        delayedTwiceRefresh,
        getDocumentSearchResult,
        getProtyleActionByZoomIn,
        getDocumentQueryCriteria,
        bgFade,
        getRangeByElement,
    } from "@/components/search/search-util";
    import { handleSearchDragMousdown } from "@/lib/SearchUtil";
    import { getBlockIsFolded, getNotebookMapByApi } from "@/utils/api";
    import { isStrNotBlank } from "@/utils/string-util";

    export let currentTab: Custom;

    let element: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;

    let previewDivElement: HTMLElement;
    let previewProtyle: Protyle;
    let previewProtyleMatchFocusIndex: number;
    let searchInputKey: string = "";
    let documentItemSearchResult: DocumentItem[] = [];
    let selectedItemIndex: number = -1;
    let itemClickCount = 0;
    let inputChangeTimeoutId;
    let keyHandleTimeoutId;
    let isSearching: number = 0;
    let lastKeywords: string[];
    let searchResultDocumentCount: number = null;
    let curPage: number = 0;
    let totalPage: number = 0;
    let notebookMap: Map<string, Notebook> = new Map();
    // let specifiedNotebookId: string = "";
    let docFullTextSearch: boolean = true;

    onMount(async () => {
        previewProtyle = new Protyle(EnvConfig.ins.app, previewDivElement, {
            blockId: "",
            render: {
                gutter: true,
                breadcrumbDocName: true,
            },
        });
        if (currentTab) {
            currentTab.editors.push(previewProtyle);
        }
        resize();
    });

    onDestroy(() => {
        // showMessage("Hello panel closed");
        previewProtyle.destroy();
    });

    export function resize() {
        if (!document) {
            return;
        }
        if (previewProtyle && element.offsetWidth) {
            previewProtyle.protyle.element.style.width =
                element.offsetWidth / 2 + "px";
        }
        documentSearchInputFocus();
        refreshData();
    }

    async function refreshData() {
        notebookMap.clear();
        notebookMap = await getNotebookMapByApi(false);
    }

    function documentSearchInputFocus() {
        if (!documentSearchInputElement) {
            return;
        }
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

        let selectedItem = selectItemByArrowKeys(
            event,
            selectedItemIndex,
            documentItemSearchResult,
        );

        documentSearchInputFocus();
        if (selectedItem) {
            selectedItemIndex = selectedItem.index;
            expandSelectedItemDocument(selectedItem);
            scrollToSelectedBlock(selectedItem);

            // 清除之前的定时器
            clearTimeout(keyHandleTimeoutId);
            // 用来处理防止长按箭头，会一直刷新预览区域，节省性能开销。
            keyHandleTimeoutId = setTimeout(() => {
                refreshBlockPreviewBox(
                    selectedItem.block.id,
                    selectedItem.block.root_id,
                );
            }, 50);

            if (event.key === "Enter") {
                openBlockTab(selectedItem.block.id);
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
                if (subItem == selectedItem) {
                    item.isCollapsed = false;

                    // 响应式有延迟，需要自己修改一下类样式。。。
                    let itemElements = element.querySelectorAll(
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
        let searchResultListElement = element.querySelector(
            "#documentSearchList",
        ) as HTMLElement;

        let focusItem = element.querySelector(
            `div[data-type="search-item"][data-node-id="${selectedItem.block.id}"]`,
        ) as HTMLElement;

        if (!focusItem) {
            focusItem = element.querySelector(
                `div.b3-list-item[data-node-id="${selectedItem.block.id}"]`,
            ) as HTMLElement;
        }

        if (!searchResultListElement || !focusItem) {
            return;
        }

        // console.log("focusItem.offsetTop", focusItem.offsetTop);
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
        console.log("handleSearchInputKeydown event.key ", event.key);
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

    async function refreshSearch(searchKey: string, pageNum: number) {
        isSearching++;
        // let includeNotebookIds = [];
        // if (specifiedNotebookId) {
        //     includeNotebookIds.push(specifiedNotebookId);
        // }
        let documentQueryCriteria = getDocumentQueryCriteria(
            searchKey,
            docFullTextSearch,
            // includeNotebookIds,
            pageNum,
        );
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

            // let protyleTemp = previewProtyle;
            // protyleTemp.destroy();

            previewProtyle = new Protyle(EnvConfig.ins.app, previewDivElement, {
                blockId: "",
                render: {
                    gutter: true,
                    breadcrumbDocName: true,
                },
            });
            return;
        }
        selectedItemIndex = -1;

        documentItemSearchResult = result.documentItems;
        lastKeywords = result.searchCriterion.includeKeywords;

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

    function clickItem(event, item: BlockItem) {
        let block = item.block;
        let blockId = block.id;
        let rootId = block.root_id;
        selectedItemIndex = item.index;
        let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;

        documentSearchInputFocus();

        itemClickCount++;
        if (itemClickCount === 1) {
            refreshBlockPreviewBox(blockId, rootId);
            // 单击逻辑
            setTimeout(() => {
                itemClickCount = 0; // 重置计数
            }, doubleClickTimeout);
        } else if (itemClickCount === 2) {
            openBlockTab(blockId);
            itemClickCount = 0; // 重置计数
        }

        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    function openBlockTab(blockId: string) {
        getOpenTabAction(blockId).then((actions: TProtyleAction[]) => {
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
        });
    }

    async function refreshBlockPreviewBox(blockId: string, rootId: string) {
        if (!blockId) {
            return;
        }

        if (previewProtyle.protyle.block.id == blockId) {
            previewProtyleMatchFocusIndex++;

            let matchFocusRangePromise = highlightElementTextByCss(
                previewProtyle.protyle.contentElement,
                lastKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
            );
            matchFocusRangePromise.then((focusRange) => {
                renderNextSearchMarkSmoothByRange(focusRange);
            });

            return;
        }
        previewProtyleMatchFocusIndex = 0;
        let zoomIn = await getBlockIsFolded(blockId);
        let actions = getProtyleActionByZoomIn(zoomIn);

        if (
            !zoomIn &&
            previewProtyle.protyle.block.rootID == rootId &&
            document.contains(previewProtyle.protyle.contentElement)
        ) {
            let targetNodeElement: Element | null =
                previewProtyle.protyle.contentElement.querySelector(
                    `[data-node-id="${blockId}"]`,
                );
            if (targetNodeElement) {
                let matchFocusRangePromise = highlightElementTextByCss(
                    previewProtyle.protyle.contentElement,
                    lastKeywords,
                    blockId,
                    previewProtyleMatchFocusIndex,
                );

                matchFocusRangePromise.then((focusRange) => {
                    if (!focusRange) {
                        focusRange = getRangeByElement(targetNodeElement);
                    }
                    renderNextSearchMarkSmoothByRange(focusRange);
                });

                bgFade(targetNodeElement);

                return;
            }
        }

        let tempDivElement = document.createElement("div");

        previewProtyle = new Protyle(EnvConfig.ins.app, tempDivElement, {
            blockId: blockId,
            render: {
                gutter: true,
                breadcrumbDocName: true,
            },
            action: actions,
            after: (protyle: Protyle) => {
                // 这样可以降低预览区刷新空白延迟，但不清楚有没有副作用。
                previewDivElement.innerHTML = "";
                previewDivElement.append(
                    ...Array.from(tempDivElement.childNodes),
                );
                previewProtyle.protyle.element = previewDivElement;
                afterCreateProtyle(protyle, blockId);
            },
        });
    }

    function afterCreateProtyle(protyle: Protyle, blockId: string) {
        let protyleContentElement = protyle.protyle.contentElement;
        delayedTwiceRefresh(() => {
            let matchFocusRangePromise = highlightElementTextByCss(
                protyleContentElement,
                lastKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
            );

            matchFocusRangePromise.then((focusRange) => {
                renderFirstSearchMarkByRange(focusRange);
            });
        }, 0);
    }

    function renderFirstSearchMarkByRange(matchRange: Range) {
        if (matchRange) {
            // matchElement.classList.add("search-mark--hl");
            const protyleElement = previewProtyle.protyle.contentElement;
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

    function renderNextSearchMarkSmoothByRange(matchRange: Range) {
        if (matchRange) {
            const matchElement =
                matchRange.commonAncestorContainer.parentElement;
            if (
                matchElement.clientHeight >
                previewProtyle.protyle.contentElement.clientHeight
            ) {
                const protyleElement = previewProtyle.protyle.contentElement;
                const contentRect = protyleElement.getBoundingClientRect();
                let scrollTop =
                    protyleElement.scrollTop +
                    matchRange.getBoundingClientRect().top -
                    contentRect.top -
                    contentRect.height / 2;
                protyleElement.scrollTo({
                    top: scrollTop,
                    behavior: "smooth",
                });
            } else {
                matchElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center",
                });
            }
            CSS.highlights.set(
                "search-result-focus",
                new Highlight(matchRange),
            );
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

    function clickSearchSettingHub() {
        openSettingsDialog("settingHub");
    }
    function docFullTextSearchChange() {
        docFullTextSearch = !docFullTextSearch;
        refreshSearch(searchInputKey, 1);
    }

    // function specifiedNotebookIdChange(event) {
    //     specifiedNotebookId = event.target.value;
    //     refreshSearch(searchInputKey, 1);
    // }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- <div class="layout-tab-container fn__flex-1" bind:this={element}> -->
<div
    class="fn__flex-column document-search-plugin__area"
    style="height: 100%;"
    bind:this={element}
>
    <div class="block__icons" style="overflow: auto">
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
        <span
            class="fn__flex-shrink ft__selectnone
            {searchResultDocumentCount == null || searchResultDocumentCount == 0
                ? 'fn__none'
                : ''}"
        >
            {curPage}/{totalPage}
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
        <span class="fn__space"></span>
        <!-- <select
            class="b3-select fn__flex-center ariaLabel"
            style="max-width: 180px;"
            aria-label={EnvConfig.ins.i18n.specifyNotebook}
            on:change={specifiedNotebookIdChange}
        >
            <option value=""> 🌐{EnvConfig.ins.i18n.allNotebooks} </option>
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
        </select> -->

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
        <span class="fn__space"></span>
        <span
            aria-label={EnvConfig.ins.i18n.config}
            class="block__icon block__icon--show ariaLabel"
            data-position="9bottom"
            on:click={clickSearchSettingHub}
            on:keydown={handleKeyDownDefault}
        >
            <svg><use xlink:href="#iconSettings"></use></svg>
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

            <div class="fn__flex">
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
        </div>
    </div>
    <div class="search__layout search__layout--row">
        <SearchResultItem
            {documentItemSearchResult}
            selectedIndex={selectedItemIndex}
            clickCallback={clickItem}
        />

        <div class="search__drag" on:mousedown={handleSearchDragMousdown}></div>
        <div
            id="documentSearchPreview"
            class="search__preview"
            bind:this={previewDivElement}
        ></div>
    </div>
</div>
<div
    class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}"
    style="top:85px"
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
