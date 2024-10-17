<script lang="ts">
    import {
        DocumentQueryCriteria,
        generateDocumentListSql,
    } from "@/services/search-sql";
    import { onDestroy, onMount } from "svelte";
    import { sql } from "@/utils/api";
    import { DocumentTreeItemInfo } from "@/config/document-model";
    import {
        escapeAttr,
        highlightBlockContent,
        scrollByRange,
    } from "@/utils/html-util";
    import {
        TProtyleAction,
        openMobileFileById,
        openTab,
        Constants,
        ITab,
    } from "siyuan";
    import { EnvConfig } from "@/config/env-config";
    import {
        delayedTwiceRefresh,
        getNotebookMap,
        highlightElementTextByCss,
    } from "@/components/search/search-util";
    import {
        convertIalStringToObject,
        convertIconInIal,
    } from "@/utils/icon-util";
    import { SettingConfig } from "@/services/setting-config";
    import { SETTING_FLAT_DOCUMENT_TREE_SORT_METHOD_ELEMENT } from "@/config/setting-constant";
    import { getFileArialLabel } from "@/components/doc-tree/doc-tree-util";
    import { isElementHidden } from "@/utils/html-util";
    import { splitKeywordStringToArray } from "@/utils/string-util";
    import {
        clearSyFileTreeItemFocus,
        determineOpenTabPosition,
        getActiveTab,
        isTouchDevice,
    } from "@/utils/siyuan-util";
    import { hasClosestByTag } from "@/lib/siyuan/hasClosest";
    import { isArrayEmpty, isArrayNotEmpty } from "@/utils/array-util";

    let rootElement: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;
    let selectedItemIndex: number = -1;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let searchInputKey: string = "";
    let documentItems: DocumentTreeItemInfo[] = [];
    let flatDocTreeSortMethod: DocumentSortMethod = "modifiedDesc";
    let flatDocFullTextSearch: boolean = false;
    let notebookMap: Map<string, Notebook> = new Map();
    let specifiedNotebookId: string = "";

    let lastResizeHideDock: boolean = true;
    let waitRefreshByDatabase: boolean = false;

    let lastOpenBlockId: string;
    let previewProtyleMatchFocusIndex: number = 0;

    onMount(async () => {
        resize();
        initData();
        initSiyuanEventBus();
        // EnvConfig.ins.plugin.eventBus.on(
        //     "open-menu-doctree",
        //     handleOpenMenuDoctreeEvent,
        // );
    });

    onDestroy(() => {
        destorySiyuanEventBus();
    });

    function initData() {
        flatDocFullTextSearch = SettingConfig.ins.flatDocFullTextSearch;
    }

    function initSiyuanEventBus() {
        // console.log("initSiyuanEventBus");
        EnvConfig.ins.plugin.eventBus.on("ws-main", wsMainHandleri);
    }

    function destorySiyuanEventBus() {
        // console.log("destorySiyuanEventBus");
        EnvConfig.ins.plugin.eventBus.off("ws-main", wsMainHandleri);
    }

    function wsMainHandleri(e: any) {
        if (!e || !e.detail) {
            return;
        }
        let detail = e.detail;

        switch (detail.cmd) {
            case "createdailynote":
            case "heading2doc":
            case "li2doc":
            case "create":
            case "savedoc":
                waitRefreshByDatabase = true;

                break;
            case "removeDoc":
                let ids = detail.data.ids as string[];
                for (const item of documentItems) {
                    if (ids.includes(item.block.id)) {
                        waitRefreshByDatabase = true;
                        break;
                    }
                }
                break;
            case "moveDoc":
                waitRefreshByDatabase = true;

                break;
            case "rename":
                let id = detail.data.id as string;

                for (const item of documentItems) {
                    if (id == item.block.id) {
                        waitRefreshByDatabase = true;
                        break;
                    }
                }
                break;
            case "databaseIndexCommit":
                if (waitRefreshByDatabase) {
                    waitRefreshByDatabase = false;
                    refreshFileTree(searchInputKey, 1, false);
                }
                break;
        }
        // if (waitRefreshByDatabase) {
        //     refreshFileTree(searchInputKey, 1);
        // }
    }

    export function resize(clientWidth?: number) {
        if (!document) {
            return clientWidth;
        }

        restView();
    }

    function restView() {
        let hiddenDock = isElementHidden(rootElement);
        if (lastResizeHideDock && !hiddenDock) {
            refreshData();
            documentSearchInputElement.focus();
            refreshFileTree(searchInputKey, 1);
        }
        lastResizeHideDock = hiddenDock;
    }

    async function refreshData() {
        notebookMap = await getNotebookMap(false);
    }

    function documentSortMethodChange(event) {
        flatDocTreeSortMethod = event.target.value;
        refreshFileTree(searchInputKey, 1);
    }

    function documentFullTextSearchChange(event) {
        flatDocFullTextSearch = !flatDocFullTextSearch;
        refreshFileTree(searchInputKey, 1);
    }

    function specifiedNotebookIdChange(event) {
        specifiedNotebookId = event.target.value;
        refreshFileTree(searchInputKey, 1);
    }

    async function itemClick(event, item: DocumentTreeItemInfo) {
        if (!item || !item.block) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();

        const target = event.currentTarget as HTMLElement;
        let blockId = item.block.id;

        if (isToggleFocusEvent(event)) {
            toggleItemFocus(target);
            return;
        }
        if (selectedItemIndex != item.index) {
            clearItemFocus();
            selectedItemIndex = item.index;
        }

        const tabPosition = determineOpenTabPosition(event);
        openBlockTab(blockId, tabPosition);
    }
    function isToggleFocusEvent(event: MouseEvent): boolean {
        return event.ctrlKey && !event.altKey && !event.shiftKey;
    }
    function toggleItemFocus(target: HTMLElement) {
        target.classList.toggle("b3-list-item--focus");
    }

    function clearItemFocus() {
        rootElement
            .querySelectorAll("li.b3-list-item--focus")
            .forEach((liItem) => {
                liItem.classList.remove("b3-list-item--focus");
            });
    }

    async function openBlockTab(
        blockId: string,
        tabPosition: "right" | "bottom",
    ) {
        let actions: TProtyleAction[] = [
            Constants.CB_GET_FOCUS,
            Constants.CB_GET_SCROLL,
        ];

        if (EnvConfig.ins.isMobile) {
            openMobileFileById(EnvConfig.ins.app, blockId, actions);
        } else {
            openDestopBlockTab(actions, blockId, tabPosition);
        }
    }

    async function openDestopBlockTab(
        actions: TProtyleAction[],
        blockId: string,
        tabPosition: "right" | "bottom",
    ) {
        if (lastOpenBlockId == blockId && flatDocFullTextSearch) {
            previewProtyleMatchFocusIndex++;
        } else {
            previewProtyleMatchFocusIndex = -1;
        }
        lastOpenBlockId = blockId;
        // 优化定位，搜索出来打开，第一次打开不定位，这样默认会是上一次的界面，防止一点开就定位到开头。;
        // 如果被查找节点不是聚焦状态，节点文档是当前查看文档，节点的文档element 存在，文档element 包含查找的节点
        let activeDocTab = getActiveTab();
        let lastKeywords = splitKeywordStringToArray(searchInputKey);
        if (isArrayNotEmpty(lastKeywords) && activeDocTab) {
            let activeDocContentElement = activeDocTab.querySelector(
                "div.protyle-content",
            ) as HTMLElement;
            let activeNodeId = activeDocContentElement
                .querySelector("div.protyle-title.protyle-wysiwyg--attr")
                ?.getAttribute("data-node-id");
            if (activeNodeId == blockId) {
                let matchFocusRangePromise = highlightElementTextByCss(
                    activeDocContentElement,
                    lastKeywords,
                    null,
                    previewProtyleMatchFocusIndex,
                );
                if (previewProtyleMatchFocusIndex >= 0) {
                    matchFocusRangePromise.then((focusRange) => {
                        renderNextSearchMarkByRange(focusRange);
                    });
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
            position: tabPosition,
            afterOpen() {
                afterOpenDocTab(docTabPromise);
            },
        });
    }

    async function afterOpenDocTab(docTabPromise: Promise<ITab>) {
        let lastKeywords = splitKeywordStringToArray(searchInputKey);
        if (isArrayEmpty(lastKeywords)) {
            return;
        }
        previewProtyleMatchFocusIndex = -1;
        let docTab = await docTabPromise;
        let lastDocumentContentElement = docTab.panelElement
            .children[1] as HTMLElement;

        delayedTwiceRefresh(() => {
            highlightElementTextByCss(
                lastDocumentContentElement,
                lastKeywords,
                null,
                null,
            );
        }, 50);
    }

    // function renderFirstSearchMarkByRange(matchRange: Range) {
    //     scrollByRange(matchRange, "nearest");
    // }

    function renderNextSearchMarkByRange(matchRange: Range) {
        scrollByRange(matchRange, "center");
    }

    async function refreshFileTree(
        searchKey: string,
        pageNum: number,
        showLoadding: boolean = true,
    ) {
        // 每次查询改为1，防止因为异常，加载图案不会消失。
        if (showLoadding) {
            isSearching = 1;
        } else {
            isSearching = 0;
        }
        clearItemFocus();

        if (!notebookMap.has(specifiedNotebookId)) {
            specifiedNotebookId = "";
        }

        // 去除多余的空格，并将输入框的值按空格分割成数组
        let keywords = searchKey.trim().replace(/\s+/g, " ").split(" ");
        // 过滤掉空的搜索条件并使用 Set 存储唯一的关键词
        const uniqueKeywordsSet = new Set(
            keywords.filter((keyword) => keyword.length > 0),
        );

        let includeConcatFields = SettingConfig.ins.includeQueryFields;

        let includeNotebookIds = [];
        if (specifiedNotebookId) {
            includeNotebookIds.push(specifiedNotebookId);
        }

        // let flatDocFullTextSearch = SettingConfig.ins.flatDocFullTextSearch;
        let flatDocAllShowLimit = SettingConfig.ins.flatDocAllShowLimit;
        let pages = [pageNum, flatDocAllShowLimit];

        // 将 Set 转换为数组
        keywords = Array.from(uniqueKeywordsSet);
        let queryCriteria: DocumentQueryCriteria = new DocumentQueryCriteria(
            keywords,
            flatDocFullTextSearch,
            pages,
            flatDocTreeSortMethod,
            null,
            null,
            includeConcatFields,
            includeNotebookIds,
            null,
        );

        let documentListSql = generateDocumentListSql(queryCriteria);
        let documentSearchResults: any[] = await sql(documentListSql);
        documentItems = await processQueryResults(
            documentSearchResults,
            queryCriteria,
        );
        isSearching = Math.max(0, isSearching - 1);
    }

    async function processQueryResults(
        blocks: any[],
        queryCriteria: DocumentQueryCriteria,
    ): Promise<DocumentTreeItemInfo[]> {
        let notebookMap = await getNotebookMap(false);
        let keywords = queryCriteria.keywords;

        let documentBlockInfos: DocumentTreeItemInfo[] = [];

        let index = 0;
        for (const block of blocks) {
            if (!block) {
                continue;
            }

            highlightBlockContent(block, keywords);
            let icon = null;
            if (block.ial) {
                let ial = convertIalStringToObject(block.ial);
                icon = convertIconInIal(ial.icon);
            }

            let notebookInfo = notebookMap.get(block.box);
            let boxName = "block.box";
            if (notebookInfo) {
                boxName = notebookInfo.name;
            }
            let refCount = block.refCount;

            let ariaLabel = getFileArialLabel(block, boxName);
            let documentBlockInfo = new DocumentTreeItemInfo();
            documentBlockInfo.block = block;

            documentBlockInfo.icon = icon;
            documentBlockInfo.boxName = boxName;
            documentBlockInfo.refCount = refCount;
            documentBlockInfo.ariaLabel = ariaLabel;
            documentBlockInfo.index = index;
            documentBlockInfos.push(documentBlockInfo);
            index++;
        }

        return documentBlockInfos;
    }

    function handleKeyDownSelectItem(event: KeyboardEvent) {
        let selectedItem = selectItemByArrowKeys(
            event,
            selectedItemIndex,
            documentItems,
        );

        if (selectedItem) {
            selectedItemIndex = selectedItem.index;

            if (event.key === "Enter") {
                openBlockTab(selectedItem.block.id, null);
            }
        }
    }

    function selectItemByArrowKeys(
        event: KeyboardEvent,
        selectedItemIndex: number,
        documentItems: DocumentTreeItemInfo[],
    ): DocumentTreeItemInfo {
        let selectedItem: DocumentTreeItemInfo = null;

        if (!event || !event.key) {
            return selectedItem;
        }
        let keydownKey = event.key;
        if (
            keydownKey !== "ArrowUp" &&
            keydownKey !== "ArrowDown" &&
            keydownKey !== "Enter"
        ) {
            return selectedItem;
        }

        event.stopPropagation();

        if (event.key === "ArrowUp") {
            if (selectedItemIndex > 0) {
                selectedItemIndex -= 1;
            }
        } else if (event.key === "ArrowDown") {
            let lastDocumentItem = documentItems[documentItems.length - 1];
            if (!lastDocumentItem) {
                return selectedItem;
            }
            let lastIndex = lastDocumentItem.index;
            if (selectedItemIndex < lastIndex) {
                selectedItemIndex += 1;
            }
        }
        for (const item of documentItems) {
            if (selectedItemIndex == item.index) {
                selectedItem = item;
                break;
            }
        }

        return selectedItem;
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
            refreshFileTree(inputValue, 1);
        }, 450);
    }

    function clearDocumentSearchInput() {
        searchInputKey = "";
        refreshFileTree(searchInputKey, 1);
    }

    /**拖拽*/
    function docListItemDragstartEvent(event: any) {
        let syFileTreeElement = document.querySelector(
            "div.file-tree.sy__file > div.fn__flex-1 ",
        );
        if (!syFileTreeElement) {
            return;
        }
        // 清除可能存在的拖拽遗留数据
        window.siyuan.dragElement = undefined;
        document
            .querySelectorAll(".misuzu-drag-hide-doc-list")
            .forEach((item) => {
                item.remove();
            });
        clearSyFileTreeItemFocus();

        // 下面全抄官方的，把 this.element 换成了 rootElement
        // https://github.com/siyuan-note/siyuan/blob/f3b0ee51d5fb505c852c7378ba85776d15e22b86/app/src/layout/dock/Files.ts#L371
        event as DragEvent & { target: HTMLElement };
        if (isTouchDevice()) {
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        window.getSelection().removeAllRanges();
        const liElement = hasClosestByTag(event.target, "LI");
        if (liElement) {
            let selectElements: Element[] = Array.from(
                rootElement.querySelectorAll(".b3-list-item--focus"),
            );
            if (!liElement.classList.contains("b3-list-item--focus")) {
                selectElements.forEach((item) => {
                    item.classList.remove("b3-list-item--focus");
                });
                liElement.classList.add("b3-list-item--focus");
                selectElements = [liElement];
            }
            let ids = "";
            const ghostElement = document.createElement("ul");
            selectElements.forEach((item: HTMLElement, index) => {
                ghostElement.append(item.cloneNode(true));
                item.style.opacity = "0.1";
                const itemNodeId = item.dataset.nodeId || item.dataset.path; // 拖拽笔记本时值不能为空，否则 drop 就不会继续排序
                if (itemNodeId) {
                    ids += itemNodeId;
                    if (index < selectElements.length - 1) {
                        ids += ",";
                    }
                }
                // 关键代码：克隆节点，添加到文档树节点内；这样就可以在拖拽结束后被官方代码查询到并实现业务。
                let hideListElement = item.cloneNode(true) as HTMLElement;
                hideListElement.style.display = "none";
                hideListElement.classList.add("misuzu-drag-hide-doc-list");
                syFileTreeElement.append(hideListElement);
            });
            ghostElement.setAttribute(
                "style",
                `width: 219px;position: fixed;top:-${selectElements.length * 30}px`,
            );
            ghostElement.setAttribute("class", "b3-list b3-list--background");
            document.body.append(ghostElement);
            event.dataTransfer.setDragImage(ghostElement, 16, 16);
            event.dataTransfer.setData(Constants.SIYUAN_DROP_FILE, ids);
            event.dataTransfer.dropEffect = "move";
            window.siyuan.dragElement = document.createElement("div");
            window.siyuan.dragElement.innerText = ids;
            setTimeout(() => {
                ghostElement.remove();
            });
        }
    }

    function docListItemDragendEvent() {
        // 官方代码
        // https://github.com/siyuan-note/siyuan/blob/f3b0ee51d5fb505c852c7378ba85776d15e22b86/app/src/layout/dock/Files.ts#L415
        rootElement
            .querySelectorAll(".b3-list-item")
            .forEach((item: HTMLElement) => {
                item.style.opacity = "";
            });
        window.siyuan.dragElement = undefined;
        // 清除临时节点数据。
        document
            .querySelectorAll(".misuzu-drag-hide-doc-list")
            .forEach((item) => {
                item.remove();
            });
    }

    function handleKeyDownDefault() {}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-label-has-associated-control -->
<div class="fn__flex-column" style="height: 100%;" bind:this={rootElement}>
    <div class="flat_doc_tree--top">
        <div
            class="block__icons"
            style="overflow: auto;flex-wrap: wrap;height:auto;padding-left:2px;padding-right:2px;"
        >
            <div style="display:flex;padding:3px 0px; ">
                <select
                    class="b3-select fn__flex-center ariaLabel"
                    style="max-width: 120px;"
                    aria-label={EnvConfig.ins.i18n.specifyNotebook}
                    on:change={specifiedNotebookIdChange}
                >
                    <option value="">
                        🌐{EnvConfig.ins.i18n.allNotebooks}
                    </option>
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
            </div>
            <span class="fn__space"></span>
            <div style="display:flex;padding:3px 0px;">
                <!-- <span style="display: flex;align-items: center;padding:5px;"
                    >{EnvConfig.ins.i18n.sort}:
                </span> -->
                <select
                    class="b3-select fn__flex-center"
                    style="max-width: 110px;"
                    on:change={documentSortMethodChange}
                >
                    {#each SETTING_FLAT_DOCUMENT_TREE_SORT_METHOD_ELEMENT() as element}
                        <option
                            value={element.value}
                            selected={element.value == flatDocTreeSortMethod}
                        >
                            {element.text}
                        </option>
                    {/each}
                </select>
            </div>
            <span class="fn__space"></span>
            <div style="padding: 3px 1px;">
                <label
                    class="block__icon ariaLabel {flatDocFullTextSearch
                        ? 'label-selected'
                        : ''}"
                    aria-label="使用全文搜索"
                    style="opacity: 1;"
                    on:click={documentFullTextSearchChange}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg class="ft__on-surface svg fn__flex-center"
                        ><use xlink:href="#iconFullTextSearch"></use></svg
                    >
                </label>
            </div>
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
                </span>
                <input
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
                        refreshFileTree(searchInputKey, 1);
                    }}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg><use xlink:href="#iconRefresh"></use></svg>
                </span>
            </div>
        </div>
    </div>
    <div class="fn__flex-1">
        {#each documentItems as item}
            <ul
                class="b3-list b3-list--background file-tree"
                data-url={item.block.box}
            >
                <li
                    data-node-id={item.block.id}
                    data-name={escapeAttr(item.block.content) + ".sy"}
                    data-type="navigation-file"
                    style="--file-toggle-width:40px;height:32px;padding:2px 5px;"
                    class="b3-list-item {item.index === selectedItemIndex
                        ? 'b3-list-item--focus'
                        : ''} "
                    data-path={item.block.path}
                    data-flat-doc-tree="true"
                    draggable="true"
                    on:click={(event) => itemClick(event, item)}
                    on:keydown={handleKeyDownDefault}
                    on:dragstart={docListItemDragstartEvent}
                    on:dragend={docListItemDragendEvent}
                >
                    <span class="b3-list-item__icon">
                        {#if item.icon}
                            {@html item.icon}
                        {:else}
                            📄
                        {/if}
                    </span>
                    <span
                        class="b3-list-item__text ariaLabel"
                        data-position="parentE"
                        aria-label={item.ariaLabel}
                    >
                        {@html item.block.content}
                    </span>

                    {#if item.refCount}
                        <span
                            class="popover__block counter b3-tooltips b3-tooltips__nw"
                            aria-label={EnvConfig.ins.i18n.reference}
                            style=""
                        >
                            {item.refCount}
                        </span>
                    {/if}
                </li>
            </ul>
        {/each}
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
    /*面板标题*/
    .flat_doc_tree--top .block__icons {
        min-height: 42px;
        padding: 0 8px;
    }
    .flat_doc_tree--top .label-selected {
        // border: 1px solid #66ccff; rgba(102, 204, 255, 0.5)
        // box-shadow: inset 0 0 5px 2px var(--b3-theme-primary-light);
        background-color: var(--b3-theme-primary-light);
        transition: box-shadow 0.5s ease-in-out;
    }
    .flat_doc_tree--top .block__icon svg {
        height: 16px; 
        width: 16px;
    }
</style>
