<script lang="ts">
    import SettingDock from "@/components/setting/setting-dock.svelte";
    import SettingOther from "@/components/setting/setting-other.svelte";
    import SettingAttr from "@/components/setting/setting-attr.svelte";
    import SettingType from "@/components/setting/setting-type.svelte";
    import SettingNotebook from "@/components/setting/setting-notebook.svelte";
    import SettingLayout from "@/components/setting/setting-layout.svelte";
    import { EnvConfig } from "@/config/env-config";
    import SettingFlatDocTree from "./setting-flat-doc-tree.svelte";

    const groups = [
        {
            title: EnvConfig.ins.i18n.settingDock,
            type: "settingDock",
        },
        {
            title: EnvConfig.ins.i18n.settingNotebookFilter,
            type: "settingNotebook",
        },
        {
            title: EnvConfig.ins.i18n.settingType,
            type: "settingType",
        },
        {
            title: EnvConfig.ins.i18n.settingAttr,
            type: "settingAttr",
        },
        {
            title: EnvConfig.ins.i18n.settingOther,
            type: "settingOther",
        },
        {
            title: EnvConfig.ins.i18n.settingFlatDocTree,
            type: "settingFlatDocTree",
        },
    ];

    let activeTab = groups[0].type;
    $: tabs = groups.map((g) => ({ key: g.type, label: g.title }));
</script>

<div class="ds-setting-hub">
    <SettingLayout bind:activeTab {tabs}>
        {#if activeTab === "settingDock"}
            <SettingDock />
        {:else if activeTab === "settingNotebook"}
            <SettingNotebook />
        {:else if activeTab === "settingType"}
            <SettingType />
        {:else if activeTab === "settingAttr"}
            <SettingAttr />
        {:else if activeTab === "settingOther"}
            <SettingOther />
        {:else if activeTab === "settingFlatDocTree"}
            <SettingFlatDocTree />
        {/if}
    </SettingLayout>
</div>

<style lang="scss">
    .ds-setting-hub {
        height: 100%;
    }
</style>
