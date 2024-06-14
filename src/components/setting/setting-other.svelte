<script lang="ts">
    import { SettingConfig } from "@/services/setting-config";
    import {
        SETTING_CONTENT_BLOCK_SORT_METHOD_ELEMENT,
        SETTING_DOCUMENT_SORT_METHOD_ELEMENT,
    } from "@/config/setting-constant";
    import { EnvConfig } from "@/config/env-config";
    let documentSortMethod: DocumentSortMethod =
        SettingConfig.ins.documentSortMethod;
    let contentBlockSortMethod: ContentBlockSortMethod =
        SettingConfig.ins.contentBlockSortMethod;
    let pageSize: number = SettingConfig.ins.pageSize;
    let maxExpandCount: number = SettingConfig.ins.maxExpandCount;
    let alwaysExpandSingleDoc: boolean =
        SettingConfig.ins.alwaysExpandSingleDoc;
    let showChildDocument: boolean = SettingConfig.ins.showChildDocument;
    let swapDocItemClickLogic: boolean =
        SettingConfig.ins.swapDocItemClickLogic;
    let doubleClickTimeout = SettingConfig.ins.doubleClickTimeout;
    let refreshPreviewHighlightTimeout =
        SettingConfig.ins.refreshPreviewHighlightTimeout;

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

    function alwaysExpandSingleDocChange(event) {
        let tempAlwaysExpandSingleDoc = alwaysExpandSingleDoc;
        if (event.target.checked) {
            tempAlwaysExpandSingleDoc = true;
        } else {
            tempAlwaysExpandSingleDoc = false;
        }
        SettingConfig.ins.updateAlwaysExpandSingleDoc(
            tempAlwaysExpandSingleDoc,
        );
        alwaysExpandSingleDoc = SettingConfig.ins.alwaysExpandSingleDoc;
    }

    function swapDocItemClickLogicChange(event) {
        swapDocItemClickLogic = event.target.value;
        SettingConfig.ins.updateSwapDocItemClickLogic(
            swapDocItemClickLogic,
        );
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
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.docSortMethod}
        </div>
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center fn__size200"
            on:change={documentSortMethodChange}
        >
            {#each SETTING_DOCUMENT_SORT_METHOD_ELEMENT() as element}
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
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.contentBlockSortMethod}
        </div>
        <span class="fn__space"></span>
        <select
            class="b3-select fn__flex-center fn__size200"
            on:change={contentBlockSortMethodChange}
        >
            {#each SETTING_CONTENT_BLOCK_SORT_METHOD_ELEMENT() as element}
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
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.documentsPerPage}
        </div>
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
            aria-label={EnvConfig.ins.i18n.blockCountBehaviorTips}
        >
            {EnvConfig.ins.i18n.defaultExpansionCount}
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
            ><use xlink:href="#iconExpand"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center ariaLabel">
            {EnvConfig.ins.i18n.alwaysExpandSingleDoc}
        </div>
        <div class="b3-label__text"></div>
        <span class="fn__space"></span>
        <input
            class="b3-switch fn__flex-center"
            type="checkbox"
            checked={alwaysExpandSingleDoc}
            on:change={alwaysExpandSingleDocChange}
        />
    </label>
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconFile"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.displayDocBlock}
        </div>
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
            ><use xlink:href="#iconFile"></use></svg
        >
        <span class="fn__space"></span>
        <div
            class="fn__flex-1 fn__flex-center ariaLabel"
            aria-label={EnvConfig.ins.i18n.swapDocumentItemClickLogicTips}
        >
            {EnvConfig.ins.i18n.swapDocumentItemClickLogic}
        </div>
        <span class="fn__space"></span>
        <input
            class="b3-switch fn__flex-center"
            type="checkbox"
            checked={swapDocItemClickLogic}
            on:change={swapDocItemClickLogicChange}
        />
    </label>
    <label class="fn__flex b3-label config__item">
        <svg class="ft__on-surface svg fn__flex-center"
            ><use xlink:href="#iconClock"></use></svg
        >
        <span class="fn__space"></span>
        <div class="fn__flex-1 fn__flex-center">
            {EnvConfig.ins.i18n.doubleClickTimeThreshold}
        </div>
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
            aria-label={EnvConfig.ins.i18n.previewRefreshHighlightDelayTips}
        >
            {EnvConfig.ins.i18n.previewRefreshHighlightDelay}
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
