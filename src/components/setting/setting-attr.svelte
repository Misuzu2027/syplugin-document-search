<script lang="ts">
    import { SettingConfig } from "@/services/setting-config";
    import { SETTING_BLOCK_ATTR_ELEMENT } from "@/config/setting-constant";
    let includeAttrFields: string[] = SettingConfig.ins.includeAttrFields;

    function checkboxChange(event) {
        const value = event.target.value;
        let tempIncludeAttrFields = [];
        if (event.target.checked) {
            tempIncludeAttrFields = [...includeAttrFields, value];
        } else {
            tempIncludeAttrFields = includeAttrFields.filter(
                (type) => type !== value,
            );
        }

        SettingConfig.ins.updateIncludeAttrFields(tempIncludeAttrFields);
        includeAttrFields = SettingConfig.ins.includeAttrFields;
    }
</script>

<div id="document-search-setting-attr">
    {#each SETTING_BLOCK_ATTR_ELEMENT() as element}
        <label class="fn__flex b3-label">
            <svg class="ft__on-surface svg fn__flex-center"
                ><use xlink:href={element.icon}></use></svg
            >
            <span class="fn__space"></span>
            <div class="fn__flex-1 fn__flex-center">{element.text}</div>
            <span class="fn__space"></span>
            <input
                class="b3-switch fn__flex-center"
                type="checkbox"
                value={element.value}
                checked={includeAttrFields.includes(element.value)}
                on:change={checkboxChange}
            />
        </label>
    {/each}
</div>
