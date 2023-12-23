<script lang="ts">
    import { showMessage } from "siyuan";
    import { DocumentSearchResultItem } from "@/libs/search-data";
    import { getIconHerf } from "@/libs/icons";

    export let searchResults: DocumentSearchResultItem[];
    export let clickCallback: (block: Block) => void;

    function itemClick(block: Block) {
        if (clickCallback) {
            clickCallback(block);
        }
    }
    function handleKeyPress() {}

    function toggleItemVisibility(block: Block) {
        if (!block || !block.id) {
            return;
        }
        for (const item of searchResults) {
            if (!item || !item.block) {
                continue;
            }
            if (item.block.id === block.id) {
                if (item.subItems && item.subItems.length > 0) {
                    item.isCollapsed = !item.isCollapsed;
                    searchResults = searchResults;
                } else {
                    showMessage(
                        `${item.block.content} 下不存在符合条件的内容`,
                        5000,
                        "error",
                    );
                }
                break;
            }
        }
    }
</script>

<div
    id="searchList"
    class="fn__flex-1 search__list b3-list b3-list--background"
>
    {#each searchResults as item}
        <div
            class="b3-list-item"
            on:click={() => itemClick(item.block)}
            on:keypress={handleKeyPress}
        >
            <span
                class="b3-list-item__toggle b3-list-item__toggle--hl
                {item.subItems && item.subItems.length > 0 ? '' : 'disabled'}
                "
                on:click|stopPropagation={() =>
                    toggleItemVisibility(item.block)}
                on:keypress={handleKeyPress}
            >
                <svg
                    class="b3-list-item__arrow
                    {item.isCollapsed ? '' : 'b3-list-item__arrow--open'}"
                >
                    <use xlink:href="#iconRight"></use>
                </svg>
            </span>
            <span class="b3-list-item__graphic">📔</span>
            <span
                class="b3-list-item__text ariaLabel"
                style="color: var(--b3-theme-on-surface)"
                aria-label={item.block.hpath}
            >
                {@html item.htmlContent}
            </span>
        </div>
        <div class={item.isCollapsed ? "fn__none" : ""}>
            {#each item.subItems as subItem (subItem.block.id)}
                <div
                    style="padding-left: 36px"
                    data-type="search-item"
                    class="b3-list-item"
                    data-node-id={subItem.block.id}
                    data-root-id={subItem.block.root_id}
                    on:click={() => itemClick(subItem.block)}
                    on:keypress={handleKeyPress}
                >
                    <svg class="b3-list-item__graphic">
                        <use
                            xlink:href={getIconHerf(
                                subItem.block.type,
                                subItem.block.subtype,
                            )}
                        ></use>
                    </svg>
                    <span class="b3-list-item__text"
                        >{@html subItem.htmlContent}
                    </span>
                </div>
            {/each}
        </div>
    {/each}
</div>

<style style="CSS">
    .disabled {
        /* pointer-events: none; */ /* 禁止元素接受用户的鼠标事件 */
        opacity: 0.5; /* 设置元素透明度，表示禁用状态 */
        /* cursor: not-allowed;*/ /* 改变鼠标光标，表示不允许交互 */
    }
</style>
