<script lang="ts">
    import { SettingConfig } from "@/services/setting-config";
    import { SETTING_DOC_POISITION_ELEMENT } from "@/config/setting-constant";
    import { EnvConfig } from "@/config/env-config";

    let docSearchDockPoisition: DockPosition =
        SettingConfig.ins.docSearchDockPoisition;
    let flatDocTreeDockPoisition: DockPosition =
        SettingConfig.ins.flatDocTreeDockPoisition;

    function docSearchDockPoisitionChange(event) {
        docSearchDockPoisition = event.target.value;
        SettingConfig.ins.updateDocSearchDockPoisition(docSearchDockPoisition);
        window.location.reload();
    }

    function flatDocTreeDockPoisitionChange(event) {
        flatDocTreeDockPoisition = event.target.value;
        SettingConfig.ins.updateFlatDocTreeDockPoisition(
            flatDocTreeDockPoisition,
        );
        window.location.reload();
    }
</script>

<div id="document-search-setting-other">
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconDocumentSearch"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.documentBasedSearch} Dock
        </div>
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center fn__size200"
            on:change={docSearchDockPoisitionChange}
        >
            {#each SETTING_DOC_POISITION_ELEMENT() as element}
                <option
                    value={element.value}
                    selected={element.value == docSearchDockPoisition}
                >
                    {element.text}
                </option>
            {/each}
        </select>
    </label>

    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconFlatDocTree"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.flatDocumentTree} Dock
        </div>
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center fn__size200"
            on:change={flatDocTreeDockPoisitionChange}
        >
            {#each SETTING_DOC_POISITION_ELEMENT() as element}
                <option
                    value={element.value}
                    selected={element.value == flatDocTreeDockPoisition}
                >
                    {element.text}
                </option>
            {/each}
        </select>
    </label>
    <span class="fn__flex b3-label config__item">
        <span>{EnvConfig.ins.i18n.dockModifyTips}</span>
    </span>
</div>
