<script lang="ts">
    import SettingDock from "@/components/setting/setting-dock.svelte";
    import SettingOther from "@/components/setting/setting-other.svelte";
    import SettingAttr from "@/components/setting/setting-attr.svelte";
    import SettingType from "@/components/setting/setting-type.svelte";
    import SettingNotebook from "@/components/setting/setting-notebook.svelte";
    import { EnvConfig } from "@/config/env-config";
    import SettingFlatDocTree from "./setting-flat-doc-tree.svelte";

    let groups = [
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
            title: "扁平化文档树设置",
            type: "settingFlatDocTree",
        },
    ];
    let focusGroup = groups[0];

    /********** Events **********/
    // interface ChangeEvent {
    //     group: string;
    //     key: string;
    //     value: any;
    // }

    // const onGroupClick = (group) => {
    //     if (detail.group === groups[0]) {
    //         // setting.set(detail.key, detail.value);
    //     }
    // };
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div class="fn__flex-1 fn__flex config__panel">
    <ul class="b3-tab-bar b3-list b3-list--background">
        {#each groups as group}
            <li
                data-name="editor"
                class:b3-list-item--focus={group === focusGroup}
                class="b3-list-item"
                on:click={() => {
                    focusGroup = group;
                }}
                on:keydown={() => {}}
            >
                <span class="b3-list-item__text">{group.title}</span>
            </li>
        {/each}
    </ul>
    <div class="config__tab-wrap">
        <div class="config__tab-container">
            {#if focusGroup.type == "settingDock"}
                <SettingDock />
            {/if}
            {#if focusGroup.type == "settingNotebook"}
                <SettingNotebook />
            {/if}

            {#if focusGroup.type == "settingType"}
                <SettingType />
            {/if}

            {#if focusGroup.type == "settingAttr"}
                <SettingAttr />
            {/if}

            {#if focusGroup.type == "settingOther"}
                <SettingOther />
            {/if}
            {#if focusGroup.type == "settingFlatDocTree"}
                <SettingFlatDocTree />
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .config__panel {
        height: 100%;
    }
    .config__panel > ul > li {
        padding-left: 1rem;
    }
</style>
