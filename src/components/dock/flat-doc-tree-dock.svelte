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
        <div class="toolbar__text">扁平化文档树</div>
    </div>
    <div class="fn__flex-1">
        <FlatDocTreeSideSvelte bind:this={flatDocTreeSideSvelte} />
    </div>
{:else}
    <div class="fn__flex-1 fn__flex-column">
        <!-- <div class="block__icons">
            <div class="block__logo">
                <svg class="block__logoicon"
                    ><use xlink:href="#iconEmoji"></use></svg
                >
                扁平化文档树
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
        </div> -->
        <!-- <div class="fn__flex-1"> -->
        <FlatDocTreeSideSvelte bind:this={flatDocTreeSideSvelte} />
        <!-- </div> -->
    </div>
{/if}
