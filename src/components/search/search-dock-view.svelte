<script lang="ts">
    import { EnvConfig } from "@/config/env-config";
    import SearchSideView from "./search-side-view.svelte";

    let isMobile = EnvConfig.ins.isMobile;
    let searchSideViewSvelte: SearchSideView;

    export function resize(clientWidth?: number) {
        if (searchSideViewSvelte) {
            searchSideViewSvelte.resize(clientWidth);
        }
    }
</script>

{#if isMobile}
    <div class="toolbar toolbar--border toolbar--dark">
        <svg class="toolbar__icon"
            ><use xlink:href="#iconDocumentSearch"></use></svg
        >
        <div class="toolbar__text">基于文档搜索</div>
    </div>
    <div class="fn__flex-1">
        <SearchSideView bind:this={searchSideViewSvelte} />
    </div>
{:else}
    <SearchSideView bind:this={searchSideViewSvelte} />
    <!-- 
    <div class="fn__flex-1 fn__flex-column">
        <div class="block__icons">
            <div class="block__logo">
                <svg class="block__logoicon"
                    ><use xlink:href="#iconDocumentSearch"></use></svg
                >
                基于文档搜索
            </div>
            <span class="fn__flex-1 fn__space"></span>
            <span
                data-type="min"
                class="block__icon b3-tooltips b3-tooltips__sw"
                aria-label="Min ${adaptHotkey('⌘W')}"
                ><svg class="block__logoicon"
                    ><use xlink:href="#iconMin"></use></svg
                ></span
            >
        </div>
        <div class="fn__flex-1">
        </div>
    </div> -->
{/if}
