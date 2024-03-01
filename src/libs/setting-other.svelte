<script lang="ts">
    import { SettingConfig } from "@/libs/setting-config";
    let documentSortMethod: string = SettingConfig.ins.documentSortMethod;
    let contentBlockSortMethod: string =
        SettingConfig.ins.contentBlockSortMethod;
    let pageSize: number = SettingConfig.ins.pageSize;
    let maxExpandCount: number = SettingConfig.ins.maxExpandCount;
    let showChildDocument: boolean = SettingConfig.ins.showChildDocument;
    let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;
    let refreshPreviewHighlightTimeout =
        SettingConfig.ins.refreshPreviewHighlightTimeout;

    let documentSortMethodElement = [
        {
            text: "相关度升序",
            value: "rankAsc",
        },
        {
            text: "相关度降序",
            value: "rankDesc",
        },
        {
            text: "修改时间升序",
            value: "modifiedAsc",
        },
        {
            text: "修改时间降序",
            value: "modifiedDesc",
        },
        {
            text: "创建时间升序",
            value: "createdAsc",
        },
        {
            text: "创建时间降序",
            value: "createdDesc",
        },
    ];

    let contentBlockSortMethodElement = [
        {
            text: "类型",
            value: "type",
        },
        ...documentSortMethodElement,
    ];

    function documentSortMethodChange(event) {
        documentSortMethod = event.target.value;
        SettingConfig.ins.updateDocumentSortMethod(documentSortMethod);
    }

    function contentBlockSortMethodChange(event) {
        contentBlockSortMethod = event.target.value;
        SettingConfig.ins.updateContentBlockSortMethod(contentBlockSortMethod);
    }

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

    function doubleClickTimeoutChange(event) {
        doubleClickTimeout = event.target.value;
        SettingConfig.ins.updateDoubleClickTimeout(doubleClickTimeout);
    }

    function refreshPreviewHighlightTimeoutChange(event) {
        refreshPreviewHighlightTimeout = event.target.value;
        SettingConfig.ins.updateRefreshPreviewHighlightTimeout(
            refreshPreviewHighlightTimeout,
        );
    }
</script>

<div id="document-search-setting-other">
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconSort"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">文档排序方式</div>
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center fn__size200"
            on:change={documentSortMethodChange}
        >
            {#each documentSortMethodElement as element}
                <option
                    value={element.value}
                    selected={element.value == documentSortMethod}
                >
                    {element.text}
                </option>
            {/each}
        </select>
    </label>

    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconSort"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">内容块排序方式</div>
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center fn__size200"
            on:change={contentBlockSortMethodChange}
        >
            {#each contentBlockSortMethodElement as element}
                <option
                    value={element.value}
                    selected={element.value == contentBlockSortMethod}
                >
                    {element.text}
                </option>
            {/each}
        </select>
    </label>

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
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconClock"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">双击时间阈值(毫秒)</div>
        <span class="fn__space"></span>
        <input
            class="b3-text-field fn__flex-center fn__size200"
            type="number"
            min="0"
            bind:value={doubleClickTimeout}
            on:change={doubleClickTimeoutChange}
        />
    </label>

    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconClock"></use></svg
        >
        <span class="fn__space"></span>
        <div
            class="fn__flex-1 fn__flex-center ariaLabel"
            aria-label="用于代码块、数据库这种需要时间渲染的块高亮，太短可能会失败，不需要可以设置为0"
        >
            刷新预览区高亮延迟(毫秒)
        </div>
        <span class="fn__space"></span>
        <input
            class="b3-text-field fn__flex-center fn__size200"
            type="number"
            min="0"
            bind:value={refreshPreviewHighlightTimeout}
            on:change={refreshPreviewHighlightTimeoutChange}
        />
    </label>
</div>
