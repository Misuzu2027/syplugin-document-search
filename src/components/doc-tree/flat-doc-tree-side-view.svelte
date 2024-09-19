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
        determineOpenTabPosition,
        getActiveTab,
    } from "@/utils/siyuan-util";

    let rootElement: HTMLElement;
    let documentSearchInputElement: HTMLInputElement;
    let selectedItemIndex: number = -1;
    let inputChangeTimeoutId;
    let isSearching: number = 0;
    let searchInputKey: string = "";
    let documentItems: DocumentTreeItemInfo[] = [];
    let flatDocTreeSortMethod: DocumentSortMethod = "modifiedDesc";
    let notebookMap: Map<string, Notebook> = new Map();
    let specifiedNotebookId: string = "";

    let lastResizeHideDock: boolean = false;
    let waitRefreshByDatabase: boolean = false;

    let lastOpenBlockId: string;
    let previewProtyleMatchFocusIndex: number = 0;

    onMount(async () => {
        resize();
        initSiyuanEventBus();
        // EnvConfig.ins.plugin.eventBus.on(
        //     "open-menu-doctree",
        //     handleOpenMenuDoctreeEvent,
        // );
    });

    onDestroy(() => {
        destorySiyuanEventBus();
    });

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
                    refreshFileTree(searchInputKey, 1);
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
        let blockId = item.block.id;
        selectedItemIndex = item.index;
        const tabPosition = determineOpenTabPosition(event);
        openBlockTab(blockId, tabPosition);
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
        if (lastOpenBlockId == blockId) {
            previewProtyleMatchFocusIndex++;
        } else {
            previewProtyleMatchFocusIndex = 0;
        }
        lastOpenBlockId = blockId;
        // 如果被查找节点不是聚焦状态，节点文档是当前查看文档，节点的文档element 存在，文档element 包含查找的节点
        let activeDocTab = getActiveTab();
        if (activeDocTab) {
            let activeDocContentElement = activeDocTab.querySelector(
                "div.protyle-content",
            ) as HTMLElement;
            let activeNodeId = activeDocContentElement
                .querySelector("div.protyle-title.protyle-wysiwyg--attr")
                ?.getAttribute("data-node-id");
            if (activeNodeId == blockId) {
                let lastKeywords = splitKeywordStringToArray(searchInputKey);
                let matchFocusRangePromise = highlightElementTextByCss(
                    activeDocContentElement,
                    lastKeywords,
                    null,
                    previewProtyleMatchFocusIndex,
                );

                matchFocusRangePromise.then((focusRange) => {
                    renderNextSearchMarkByRange(focusRange);
                });

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

        let docTab = await docTabPromise;
        // console.log("afterOpenDocTab");
        let lastDocumentContentElement = docTab.panelElement
            .children[1] as HTMLElement;

        delayedTwiceRefresh(() => {
            let matchFocusRangePromise = highlightElementTextByCss(
                lastDocumentContentElement,
                lastKeywords,
                null,
                0,
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

    async function refreshFileTree(searchKey: string, pageNum: number) {
        // 每次查询改为1，防止因为异常，加载图案不会消失。
        isSearching = 1;

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

        let flatDocFullTextSearch = SettingConfig.ins.flatDocFullTextSearch;
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

    // function getFileArialLabel(block: any, boxName: string): string {
    //     let ariaLabelRow: string[] = [];
    //     // ariaLabelRow.push(block.content);
    //     if (block.name) {
    //         ariaLabelRow.push(
    //             `<br>${window.siyuan.languages.name} ${block.name}`,
    //         );
    //     }
    //     if (block.alias) {
    //         ariaLabelRow.push(
    //             `<br>${window.siyuan.languages.alias} ${block.alias}`,
    //         );
    //     }
    //     if (block.memo) {
    //         ariaLabelRow.push(
    //             `<br>${window.siyuan.languages.memo} ${block.memo}`,
    //         );
    //     }

    //     ariaLabelRow.push(`<br>${EnvConfig.ins.i18n.notebook} ${boxName}`);
    //     ariaLabelRow.push(`<br>${EnvConfig.ins.i18n.path} ${block.hpath}`);

    //     let updated = formatRelativeTimeInBlock(block.updated);
    //     let created = convertDateTimeInBlock(block.created);

    //     ariaLabelRow.push(
    //         `<br>${window.siyuan.languages.modifiedAt} ${updated}`,
    //     );
    //     ariaLabelRow.push(
    //         `<br>${window.siyuan.languages.createdAt} ${created}`,
    //     );

    //     let ariaLabel = ariaLabelRow.join("");
    //     ariaLabel = removePrefixAndSuffix(ariaLabel, "<br>", "<br>");

    //     return ariaLabel;
    // }

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
    function handleKeyDownDefault() {}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div class="fn__flex-column" style="height: 100%;" bind:this={rootElement}>
    <div class="flat_doc_tree--top">
        <div
            class="block__icons"
            style="overflow: auto;flex-wrap: wrap;height:auto;padding-left:2px;padding-right:2px;"
        >
            <div style="display:flex;padding:3px 0px; ">
                <select
                    class="b3-select fn__flex-center ariaLabel"
                    style="max-width: 125px;"
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
                    style="max-width: 118px;"
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
                    data-name={escapeAttr(item.block.name)}
                    data-type="navigation-file"
                    style="--file-toggle-width:40px;height:32px;padding:2px 5px;"
                    class="b3-list-item {item.index === selectedItemIndex
                        ? 'b3-list-item--focus'
                        : ''} "
                    data-path={item.block.path}
                    data-flat-doc-tree="true"
                    on:click={(event) => itemClick(event, item)}
                    on:keydown={handleKeyDownDefault}
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
</style>
