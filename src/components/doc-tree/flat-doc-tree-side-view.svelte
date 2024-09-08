<script lang="ts">
    import {
        DocumentQueryCriteria,
        generateDocumentListSql,
    } from "@/services/search-sql";
    import { onMount } from "svelte";
    import { sql } from "@/utils/api";
    import { DocumentTreeItemInfo } from "@/config/document-model";
    import { escapeAttr, highlightBlockContent } from "@/utils/html-util";
    import {
        TProtyleAction,
        openMobileFileById,
        openTab,
        Constants,
    } from "siyuan";
    import { EnvConfig } from "@/config/env-config";
    import { getNotebookMap } from "../search/search-util";
    import {
        convertIalStringToObject,
        convertIconInIal,
    } from "@/utils/icon-util";
    import { SettingConfig } from "@/services/setting-config";
    import { SETTING_FLAT_DOCUMENT_TREE_SORT_METHOD_ELEMENT } from "@/config/setting-constant";
    import { getFileArialLabel } from "./doc-tree-util";
    import { isElementHidden } from "@/utils/html-util";

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

    onMount(async () => {
        resize();
        restView();
        // EnvConfig.ins.plugin.eventBus.on(
        //     "open-menu-doctree",
        //     handleOpenMenuDoctreeEvent,
        // );
    });

    export function resize(clientWidth?: number) {
        if (!document) {
            return;
        }

        refreshData();
    }

    export function restView() {
        let hiddenDock = isElementHidden(rootElement);
        if (!hiddenDock) {
            documentSearchInputElement.focus();
            refreshFileTree(searchInputKey, 1);
        }
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
        openBlockTab(blockId);
    }

    async function openBlockTab(blockId: string) {
        let actions: TProtyleAction[] = [
            Constants.CB_GET_FOCUS,
            Constants.CB_GET_SCROLL,
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

        // 将 Set 转换为数组
        keywords = Array.from(uniqueKeywordsSet);
        let queryCriteria: DocumentQueryCriteria = new DocumentQueryCriteria(
            keywords,
            [pageNum, 30],
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
                openBlockTab(selectedItem.block.id);
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

<div class="fn__flex-column" style="height: 100%;" bind:this={rootElement}>
    <div class="flat_doc_tree--top">
        <div
            class="block__icons"
            style="overflow: auto;flex-wrap: wrap;height:auto"
        >
            <div style="display:flex;padding:3px 2px">
                <select
                    class="b3-select fn__flex-center ariaLabel"
                    style="max-width: 140px;"
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
            <div style="display:flex;padding:3px 2px">
                <span style="display: flex;align-items: center;padding:5px;"
                    >{EnvConfig.ins.i18n.sort}:
                </span>
                <select
                    class="b3-select fn__flex-center"
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
