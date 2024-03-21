<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        Protyle,
        openTab,
        openMobileFileById,
        TProtyleAction,
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
        getProtyleAction,
        delayedTwiceRefresh,
        getDocumentSearchResult,
    } from "@/components/search/search-util";
    import { handleSearchDragMousdown } from "@/lib/SearchUtil";

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
    let isSearching: number = 0;
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

    export function resize() {
        if (!document) {
            return;
        }
        if (previewProtyle && element.offsetWidth) {
            previewProtyle.protyle.element.style.width =
                element.offsetWidth / 2 + "px";
        }
        documentSearchInputFocus();
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

        documentSearchInputFocus();
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

    function clickItem(item: BlockItem) {
        let block = item.block;
        let blockId = block.id;
        selectedItemIndex = item.index;
        let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;

        documentSearchInputFocus();

        itemClickCount++;
        if (itemClickCount === 1) {
            refreshBlockPreviewBox(blockId);
            // 单击逻辑
            setTimeout(() => {
                itemClickCount = 0; // 重置计数
            }, doubleClickTimeout);
        } else if (itemClickCount === 2) {
            openBlockTab(blockId);
            itemClickCount = 0; // 重置计数
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

    async function refreshBlockPreviewBox(blockId: string) {
        if (!blockId) {
            return;
        }

        if (previewProtyle.protyle.block.id == blockId) {
            previewProtyleMatchFocusIndex++;

            highlightElementTextByCss(
                previewProtyle.protyle.contentElement,
                lastKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
                renderNextSearchMarkByRange,
            );
            return;
        }
        previewProtyleMatchFocusIndex = 0;
        let actions = await getProtyleAction(blockId);

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
                afterCreateProtyle(protyle, blockId);
            },
        });
    }

    function afterCreateProtyle(protyle: Protyle, blockId: string) {
        let protyleContentElement = protyle.protyle.contentElement;
        delayedTwiceRefresh(() => {
            highlightElementTextByCss(
                protyleContentElement,
                lastKeywords,
                blockId,
                previewProtyleMatchFocusIndex,
                renderNextSearchMarkByRange,
            );
        }, 0);
    }

    function renderNextSearchMarkByRange(matchRange: Range) {
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

            <div class="fn__flex">
                <span class="fn__space"></span>
                <span
                    id="documentSearchExpand"
                    class="block__icon block__icon--show ariaLabel"
                    data-position="9bottom"
                    aria-label="展开"
                    on:click={() => {
                        toggleAllCollpsedItem(documentItemSearchResult, false);
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
                        toggleAllCollpsedItem(documentItemSearchResult, true);
                    }}
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
<div class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img width="120px" src="/stage/loading-pure.svg" />
</div>
