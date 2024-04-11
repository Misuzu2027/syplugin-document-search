<script lang="ts">
    import { SettingConfig } from "@/services/setting-config";
    import { SETTING_BLOCK_TYPE_ELEMENT } from "@/config/setting-constant";
    let includeTypes: string[] = SettingConfig.ins.includeTypes;

    function checkboxChange(event) {
        const value = event.target.value;
        let tempIncludeTypes = [];
        if (event.target.checked) {
            tempIncludeTypes = [...includeTypes, value];
        } else {
            tempIncludeTypes = includeTypes.filter((type) => type !== value);
        }

        SettingConfig.ins.updateIncludeTypes(tempIncludeTypes);
        includeTypes = SettingConfig.ins.includeTypes;
    }
</script>

<div id="document-search-setting-type">
    {#each SETTING_BLOCK_TYPE_ELEMENT() as element}
        <label class="fn__flex b3-label">
            <svg class="ft__on-surface svg fn__flex-center"
                ><use xlink:href={element.icon}></use></svg
            >
            <span class="fn__space"></span>
            <div class="fn__flex-1 fn__flex-center">{element.text}</div>
            <span class="fn__space"></span>
            <input
                class="b3-switch fn__flex-center"
                data-type={element.dataType}
                type="checkbox"
                value={element.value}
                checked={includeTypes.includes(element.value)}
                on:change={checkboxChange}
            />
        </label>
    {/each}
</div>
