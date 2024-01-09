<script lang="ts">
    import { SettingConfig } from "@/libs/setting-config";
    let pageSize: number = SettingConfig.ins.pageSize;
    let maxExpandCount: number = SettingConfig.ins.maxExpandCount;
    let showChildDocument: boolean = SettingConfig.ins.showChildDocument;

    function pageSizeChange(event) {
        pageSize = event.target.value;
        SettingConfig.ins.updatePageSize(pageSize);
    }

    function maxExpandCountChange(event) {
        maxExpandCount = event.target.value;
        SettingConfig.ins.updateMaxExpandCount(maxExpandCount);
    }

    function showChildDocumentChange(event) {
        let tempShowChildDocument = showChildDocument;
        if (event.target.checked) {
            tempShowChildDocument = true;
        } else {
            tempShowChildDocument = false;
        }
        SettingConfig.ins.updateShowChildDocument(tempShowChildDocument);
        showChildDocument = SettingConfig.ins.showChildDocument;
    }
</script>

<div id="document-search-setting-other">
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconFile"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">每页文档数量</div>
        <span class="fn__space"></span>
        <input
            class="b3-text-field fn__flex-center fn__size200"
            type="number"
            min="0"
            bind:value={pageSize}
            on:change={pageSizeChange}
        />
    </label>
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconExpand"></use></svg
        >
        <span class="fn__space"></span>
        <div
            class="fn__flex-1 fn__flex-center ariaLabel"
            aria-label="如果查询结果的块数量小于当前值，默认展开全部文档；反之会默认折叠全部文档。"
        >
            默认展开数
        </div>
        <div class="b3-label__text"></div>
        <span class="fn__space"></span>
        <input
            class="b3-text-field fn__flex-center fn__size200"
            type="number"
            min="0"
            bind:value={maxExpandCount}
            on:change={maxExpandCountChange}
        />
    </label>
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconFile"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">显示文档块</div>
        <span class="fn__space"></span>
        <input
            class="b3-switch fn__flex-center"
            type="checkbox"
            checked={showChildDocument}
            on:change={showChildDocumentChange}
        />
    </label>
</div>
