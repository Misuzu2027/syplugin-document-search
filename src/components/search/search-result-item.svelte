<script lang="ts">
    import { showMessage } from "siyuan";
    import { BlockItem, DocumentItem } from "@/config/search-model";
    import { getBlockTypeIconHref } from "@/utils/icon-util";
    import {
        blockItemsSort,
        blockSortSubMenu,
    } from "@/components/search/search-util";
    import { MenuItem } from "@/lib/Menu";
    import { EnvConfig } from "@/config/env-config";
    import { SettingConfig } from "@/services/setting-config";

    export let documentItemSearchResult: DocumentItem[];
    export let clickCallback: (event, item: BlockItem) => void;
    export let selectedIndex: number = 0;

    let isSearching: number = 0;
    let itemClickCount: number = 0;
    // let docItemClickTimeout: NodeJS.Timeout = null;

    function itemClick(event, item: BlockItem) {
        if (clickCallback) {
            clickCallback(event, item);
        }
    }

    function handleKeyDownDefault(event) {
        console.log(event.key);
    }

    function clickDocItem(event: MouseEvent, documentItem: DocumentItem) {
        let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;

        // Ctrl+单击 = 执行双击逻辑
        if (event.ctrlKey) {
            executeDocItemAction(documentItem, false);
            return;
        }

        itemClickCount++;
        if (itemClickCount === 1) {
            executeDocItemAction(documentItem, true);
            // 单击逻辑
            setTimeout(() => {
                itemClickCount = 0; // 重置计数
            }, doubleClickTimeout);
        } else if (itemClickCount === 2) {
            // 双击就相当于点击了一下文档块
            executeDocItemAction(documentItem, false);
            itemClickCount = 0; // 重置计数
        }
    }
    function mousedownDocItem(event, documentItem: DocumentItem) {
        if (event.button == 1) {
            toggleItemVisibility(documentItem.block);
            event.stopPropagation();
            event.preventDefault();
        }
    }

    function executeDocItemAction(
        documentItem: DocumentItem,
        isSingleClick: boolean,
    ) {
        let swapDocItemClickLogic = SettingConfig.ins.swapDocItemClickLogic;
        if (swapDocItemClickLogic) {
            isSingleClick
                ? mockClickDocBlockItem(documentItem)
                : toggleItemVisibility(documentItem.block);
        } else {
            isSingleClick
                ? toggleItemVisibility(documentItem.block)
                : mockClickDocBlockItem(documentItem);
        }
    }

    function toggleItemVisibility(block: Block) {
        if (!block || !block.id) {
            return;
        }
        for (const item of documentItemSearchResult) {
            if (!item || !item.block) {
                continue;
            }
            if (item.block.id === block.id) {
                if (item.subItems && item.subItems.length > 0) {
                    item.isCollapsed = !item.isCollapsed;
                    documentItemSearchResult = documentItemSearchResult;
                } else {
                    showMessage(
                        `${item.block.content} ${EnvConfig.ins.i18n.noContentBelow}`,
                        5000,
                        "error",
                    );
                }
                break;
            }
        }
    }

    async function documentItemContextmenuEvent(
        event: MouseEvent,
        documentItem: DocumentItem,
    ) {
        window.siyuan.menus.menu.remove();
        window.siyuan.menus.menu.append(
            new MenuItem({
                label: EnvConfig.ins.i18n.sort,
                type: "submenu",
                submenu: blockSortSubMenu(
                    documentItem,
                    blockSortSubMenuCallback,
                ),
            }).element,
        );
        window.siyuan.menus.menu.append(
            new MenuItem({
                label: window.siyuan.languages.openBy,
                type: "submenu",
                click: () => {
                    mockClickDocBlockItem(documentItem);
                },
            }).element,
        );

        window.siyuan.menus.menu.popup({ x: event.clientX, y: event.clientY });

        // console.log(`文档右击位置 x : ${event.clientX}, y : ${event.clientY}`);
    }

    function mockClickDocBlockItem(documentItem: DocumentItem) {
        let docBlockItem = new BlockItem();
        docBlockItem.block = documentItem.block;
        docBlockItem.index = documentItem.index;
        itemClick(null, docBlockItem);
    }

    async function blockSortSubMenuCallback(
        documentItem: DocumentItem,
        sortMethod: ContentBlockSortMethod,
    ) {
        const startTime = performance.now(); // 记录开始时间

        isSearching++;
        await blockItemsSort(
            documentItem.subItems,
            sortMethod,
            documentItem.index,
        );
        documentItemSearchResult = documentItemSearchResult;
        isSearching--;
        const endTime = performance.now(); // 记录结束时间
        const executionTime = endTime - startTime; // 计算时间差
        console.log(
            `排序类型 : ${sortMethod} , 数量 : ${documentItem.subItems.length} , 消耗时长 : ${executionTime} ms`,
        );
    }
</script>

<!-- on:click={() => itemClick(item.block)} -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    id="documentSearchList"
    class="fn__flex-1 search__list b3-list b3-list--background"
>
    {#each documentItemSearchResult as item}
        <div
            class="b3-list-item {item.index === selectedIndex
                ? 'b3-list-item--focus'
                : ''} "
            on:click={(event) => clickDocItem(event, item)}
            on:mousedown={(event) => mousedownDocItem(event, item)}
            on:contextmenu|stopPropagation|preventDefault={(event) =>
                documentItemContextmenuEvent(event, item)}
            on:keydown={handleKeyDownDefault}
            data-node-id={item.block.id}
            data-root-id={item.block.root_id}
        >
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span
                class="b3-list-item__toggle b3-list-item__toggle--hl
                {item.subItems && item.subItems.length > 0 ? '' : 'disabled'}
                "
                style="padding:0 8px"
                on:click|stopPropagation|preventDefault={() =>
                    toggleItemVisibility(item.block)}
                on:keydown={handleKeyDownDefault}
            >
                <svg
                    class="b3-list-item__arrow
                    {item.isCollapsed ? '' : 'b3-list-item__arrow--open'}
                    {item.subItems && item.subItems.length > 0
                        ? ''
                        : 'disabled'}"
                >
                    <use xlink:href="#iconRight"></use>
                </svg>
            </span>
            <!-- <span class="b3-list-item__graphic"> -->
            {@html item.icon}
            <!-- </span> -->
            <span
                class="b3-list-item__text ariaLabel"
                style="color: var(--b3-theme-on-surface)"
                aria-label={item.ariaLabel}
                data-position="parentE"
            >
                {@html item.block.content}
            </span>
            <div class="protyle-attr--refcount" style="right:5px;top:6px">
                {item.subItems.length}
            </div>
        </div>
        <div>
            {#each item.subItems as subItem (subItem.block.id)}
                <div
                    style="padding-left: 36px"
                    data-type="search-item"
                    class="b3-list-item {item.isCollapsed ? 'fn__none' : ''}
                {subItem.index === selectedIndex ? 'b3-list-item--focus' : ''}"
                    data-node-id={subItem.block.id}
                    data-root-id={subItem.block.root_id}
                    on:click={(event) => itemClick(event, subItem)}
                    on:keydown={handleKeyDownDefault}
                >
                    <svg class="b3-list-item__graphic">
                        <use
                            xlink:href={getBlockTypeIconHref(
                                subItem.block.type,
                                subItem.block.subtype,
                            )}
                        ></use>
                    </svg>
                    <span class="b3-list-item__text"
                        >{@html subItem.block.content}
                    </span>

                    {#if subItem.block.name}
                        <span
                            class="b3-list-item__meta fn__flex"
                            style="max-width: 30%"
                        >
                            <svg class="b3-list-item__hinticon">
                                <use xlink:href="#iconN"></use>
                            </svg><span class="b3-list-item__hinttext">
                                {@html subItem.block.name}
                            </span>
                        </span>
                    {/if}
                    {#if subItem.block.alias}
                        <span
                            class="b3-list-item__meta fn__flex"
                            style="max-width: 30%"
                        >
                            <svg class="b3-list-item__hinticon">
                                <use xlink:href="#iconA"></use>
                            </svg><span class="b3-list-item__hinttext">
                                {@html subItem.block.alias}
                            </span>
                        </span>
                    {/if}
                    {#if subItem.block.memo}
                        <span
                            class="b3-list-item__meta fn__flex"
                            style="max-width: 30%"
                        >
                            <svg class="b3-list-item__hinticon"
                                ><use xlink:href="#iconM"></use></svg
                            ><span class="b3-list-item__hinttext">
                                {@html subItem.block.memo}
                            </span>
                        </span>
                    {/if}
                </div>
            {/each}
        </div>
    {/each}

    <div
        class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}"
    >
        <!-- svelte-ignore a11y-missing-attribute -->
        <img width="120px" src="/stage/loading-pure.svg" />
    </div>
</div>

<style style="CSS">
    .disabled {
        /* pointer-events: none; */ /* 禁止元素接受用户的鼠标事件 */
        opacity: 0.5; /* 设置元素透明度，表示禁用状态 */
        /* cursor: not-allowed;*/ /* 改变鼠标光标，表示不允许交互 */
    }
</style>
