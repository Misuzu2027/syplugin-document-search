<script lang="ts">
    import { SettingConfig } from "@/services/setting-config";

    let flatDocAllShowLimit: number = SettingConfig.ins.flatDocAllShowLimit;
    let flatDocFullTextSearch: boolean =
        SettingConfig.ins.flatDocFullTextSearch;

    function pageSizeChange(event) {
        flatDocAllShowLimit = event.target.value;
        SettingConfig.ins.updateflatDocAllShowLimit(flatDocAllShowLimit);
    }

    function flatDocFullTextSearchChange(event) {
        let tempFlatDocFullTextSearch = flatDocFullTextSearch;
        if (event.target.checked) {
            tempFlatDocFullTextSearch = true;
        } else {
            tempFlatDocFullTextSearch = false;
        }
        SettingConfig.ins.updateflatDocFullTextSearch(
            tempFlatDocFullTextSearch,
        );
        flatDocFullTextSearch = SettingConfig.ins.flatDocFullTextSearch;
    }
</script>

<div id="document-search-setting-other">
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconFile"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">
            扁平化文档列表显示所有文档时的最大数量
        </div>
        <span class="fn__space"></span>
        <input
            class="b3-text-field fn__flex-center fn__size200"
            type="number"
            min="0"
            bind:value={flatDocAllShowLimit}
            on:change={pageSizeChange}
        />
    </label>

    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconExpand"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center ariaLabel">
            扁平化文档列表默认使用全文搜索
        </div>
        <div class="b3-label__text"></div>
        <span class="fn__space"></span>
        <input
            class="b3-switch fn__flex-center"
            type="checkbox"
            checked={flatDocFullTextSearch}
            on:change={flatDocFullTextSearchChange}
        />
    </label>
</div>
