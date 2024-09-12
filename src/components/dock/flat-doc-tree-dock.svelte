<script lang="ts">
    import { EnvConfig } from "@/config/env-config";
    import FlatDocTreeSideSvelte from "@/components/doc-tree/flat-doc-tree-side-view.svelte";
    // import { adaptHotkey } from "siyuan";

    let isMobile = EnvConfig.ins.isMobile;
    let flatDocTreeSideSvelte: FlatDocTreeSideSvelte;

    export function resize(clientWidth?: number) {
        if (flatDocTreeSideSvelte) {
            flatDocTreeSideSvelte.resize(clientWidth);
        }
    }

 
</script>

{#if isMobile}
    <div class="toolbar toolbar--border toolbar--dark">
        <svg class="toolbar__icon"
            ><use xlink:href="#iconDocumentSearch"></use></svg
        >
        <div class="toolbar__text">{EnvConfig.ins.i18n.flatDocumentTree}</div>
    </div>
    <div class="fn__flex-1">
        <FlatDocTreeSideSvelte bind:this={flatDocTreeSideSvelte} />
    </div>
{:else}
    <div class="fn__flex-1 fn__flex-column">
        <FlatDocTreeSideSvelte bind:this={flatDocTreeSideSvelte} />
    </div>
{/if}
