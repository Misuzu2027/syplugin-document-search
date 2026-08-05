<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let tabs: { key: string; label: string; icon?: string }[] = [];
    export let activeTab = "";
    export let sidebarWidth = 200;
    export let minSidebarWidth = 150;
    export let maxSidebarWidth = 360;
    export let storageKey = "document-search-setting-sidebar-width";

    let layoutRef: HTMLElement;
    let widthPx = sidebarWidth;
    let dragging = false;

    function clamp(w: number): number {
        return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, w));
    }

    function onResizeStart(e: MouseEvent) {
        e.preventDefault();
        dragging = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }

    function onResizeMove(e: MouseEvent) {
        if (!dragging || !layoutRef) return;
        const rect = layoutRef.getBoundingClientRect();
        widthPx = clamp(e.clientX - rect.left);
    }

    function onResizeEnd() {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try {
            localStorage.setItem(storageKey, String(widthPx));
        } catch {
            /* ignore */
        }
    }

    function selectTab(key: string) {
        activeTab = key;
    }

    onMount(() => {
        try {
            const saved = Number(localStorage.getItem(storageKey));
            if (!Number.isNaN(saved) && saved > 0) widthPx = clamp(saved);
        } catch {
            /* ignore */
        }
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
    });

    onDestroy(() => {
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    });
</script>

<div class="ds-setting-layout" bind:this={layoutRef}>
    <ul
        class="ds-setting-layout__sidebar b3-list b3-list--background"
        style="width:{widthPx}px;"
        role="tablist"
    >
        {#each tabs as tab (tab.key)}
            <li
                class="b3-list-item"
                class:b3-list-item--focus={activeTab === tab.key}
                on:click={() => selectTab(tab.key)}
                on:keydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectTab(tab.key);
                    }
                }}
                role="tab"
                tabindex="0"
                aria-selected={activeTab === tab.key}
            >
                {#if tab.icon}
                    <svg class="b3-list-item__graphic"
                        ><use xlink:href={`#${tab.icon}`}></use></svg
                    >
                {/if}
                <span class="b3-list-item__text">{tab.label}</span>
            </li>
        {/each}
    </ul>

    <div
        class="ds-setting-layout__resizer"
        class:ds-setting-layout__resizer--active={dragging}
        on:mousedown={onResizeStart}
        role="slider"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuenow={widthPx}
        tabindex="-1"
    ></div>

    <div class="ds-setting-layout__content">
        <slot />
    </div>
</div>

<style lang="scss">
    .ds-setting-layout {
        display: flex;
        height: 100%;
        min-width: 0;
    }
    .ds-setting-layout__sidebar {
        flex: 0 0 auto;
        overflow-x: hidden;
        overflow-y: auto;
        border-right: 1px solid var(--b3-border-color);
    }
    .ds-setting-layout__sidebar :global(.b3-list-item) {
        padding-left: 1rem;
        padding-right: 0.75rem;
        white-space: nowrap;
        cursor: pointer;
    }
    .ds-setting-layout__sidebar :global(.b3-list-item__text) {
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .ds-setting-layout__resizer {
        flex: 0 0 6px;
        margin: 0 -2px;
        cursor: col-resize;
        position: relative;
        z-index: 1;
    }
    .ds-setting-layout__resizer::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 2px;
        width: 2px;
        background-color: transparent;
        transition: background-color 0.15s ease;
    }
    .ds-setting-layout__resizer:hover::after,
    .ds-setting-layout__resizer--active::after {
        background-color: var(--b3-theme-primary);
    }
    .ds-setting-layout__content {
        flex: 1 1 auto;
        min-width: 0;
        overflow: auto;
        padding: 12px 20px 16px;
    }
</style>
