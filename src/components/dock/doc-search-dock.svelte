<script lang="ts">
    import { EnvConfig } from "@/config/env-config";
    import SearchSideView from "@/components/search/search-side-view.svelte";

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
        <div class="toolbar__text">
            {EnvConfig.ins.i18n.documentBasedSearch}
        </div>
    </div>
    <div class="fn__flex-1">
        <SearchSideView bind:this={searchSideViewSvelte} />
    </div>
{:else}
    <SearchSideView bind:this={searchSideViewSvelte} />
{/if}
