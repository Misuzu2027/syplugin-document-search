<script lang="ts">
    import { SettingConfig } from "@/services/setting-config";
    import { lsNotebooks } from "@/utils/api";
    import { onMount } from "svelte";
    import { convertIconInIal } from "../../utils/icons";
    let excludeNotebookIds: string[] = SettingConfig.ins.excludeNotebookIds;
    let notebookMap: Map<string, Notebook> = new Map();

    onMount(async () => {
        updateNotebookMap();
    });

    async function updateNotebookMap() {
        let notebooks: Notebook[] = (await lsNotebooks()).notebooks;
        for (const notebook of notebooks) {
            notebook.icon = convertIconInIal(notebook.icon);
            notebookMap.set(notebook.id, notebook);
        }
        notebookMap = notebookMap;
        // 把已经删除的笔记本id从过滤中删除
        let tempExcludeNotebookIds = excludeNotebookIds.filter((id) =>
            notebookMap.has(id),
        );
        if (tempExcludeNotebookIds.length != excludeNotebookIds.length) {
            SettingConfig.ins.updateExcludeNotebookIds(tempExcludeNotebookIds);
        }
        excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;
    }

    function checkboxChange(event) {
        const value = event.target.value;
        let tempExcludeNotebookIds = [];
        if (event.target.checked) {
            tempExcludeNotebookIds = excludeNotebookIds.filter(
                (id) => id !== value,
            );
        } else {
            tempExcludeNotebookIds = [...excludeNotebookIds, value];
        }
        console.log(`tempExcludeNotebookIds ${tempExcludeNotebookIds}`);
        SettingConfig.ins.updateExcludeNotebookIds(tempExcludeNotebookIds);
        excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;
    }
</script>

<div id="document-search-setting-notebook">
    {#each Array.from(notebookMap.entries()) as [key, item] (key)}
        <label class="fn__flex b3-label">
            <span class="b3-list-item__graphic">
                {#if item.icon}
                    {@html item.icon}
                {:else}
                    🗃
                {/if}
            </span>
            <span class="fn__space"></span>
            <div class="fn__flex-1 fn__flex-center">{item.name}</div>
            <span class="fn__space"></span>
            <input
                class="b3-switch fn__flex-center"
                type="checkbox"
                value={item.id}
                checked={!excludeNotebookIds.includes(item.id)}
                on:change={checkboxChange}
            />
        </label>
    {/each}
</div>
