<script lang="ts">
    import SettingDock from "./setting-dock.svelte";
    import SettingOther from "./setting-other.svelte";
    import SettingAttr from "./setting-attr.svelte";
    import SettingType from "./setting-type.svelte";
    import SettingNotebook from "./setting-notebook.svelte";

    let groups = [
        {
            title: "🌈 Dock 设置",
            type: "settingDock",
        },
        {
            title: "🌈 过滤笔记本",
            type: "settingNotebook",
        },
        {
            title: "🌈 类型",
            type: "settingType",
        },
        {
            title: "🌈 属性",
            type: "settingAttr",
        },
        {
            title: "🌈 其他设置",
            type: "settingOther",
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
