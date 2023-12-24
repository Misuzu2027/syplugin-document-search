<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { sql as query } from "@/utils/api";
    import { generateDocumentSearchSql } from "@/libs/search-sql";
    import {
        showMessage,
        Protyle,
        openTab,
        openMobileFileById,
        getFrontend,
    } from "siyuan";
    import SearchResultItem from "@/libs/search-result-item.svelte";
    import { DocumentSearchResultItem } from "@/libs/search-data";

    export let app;
    export let showPreview;

    let isMobile: boolean;
    const frontEnd = getFrontend();
    isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

    // let time: string = "";

    let previewDiv: HTMLDivElement;
    let previewDivProtyle: Protyle;
    let searchInputKey: string = "";
    let lastKeywords: string[] = [];
    let searchResults: DocumentSearchResultItem[] = [];
    let itemClickCount = 0;
    let searchResultDivHeight;
    let inputChaneTimeout;
    let searchBlockCount = 0;
    let maxExpandCount = 300;
    let isSearching = false;

    resize();

    export function openInit(key?: string) {
        let searchInputElement = document.getElementById(
            "documentSearchInput",
        ) as HTMLInputElement;
        if (key) {
            searchInputKey = key;
            searchInputElement.focus();
        } else {
            searchInputElement.select();
        }
    }

    export function resize() {
        let minHeight = 185;
        if (!showPreview) {
            minHeight = 145;
        }

        searchResultDivHeight = document.body.scrollHeight - minHeight;
    }

    onMount(async () => {});

    onDestroy(() => {
        showMessage("Hello panel closed");
        previewDivProtyle.destroy();
    });

    function searchHidtoryBtnClick() {
        console.log("点击搜索历史按钮");
    }

    function handleKeyPress() {}

    function handleDocumetnSearchInputChange(event) {
        let inputValue = event.target.value;
        if (!inputValue && searchInputKey === inputValue) {
            return;
        }
        // 更新输入值
        searchInputKey = inputValue;
        // 清除之前的定时器
        clearTimeout(inputChaneTimeout);

        inputChaneTimeout = setTimeout(() => {
            refreshSearch(searchInputKey);
        }, 400);
    }

    function refreshSearch(searchKy: string) {
        // 去除多余的空格，并将输入框的值按空格分割成数组
        const keywords = searchKy.trim().replace(/\s+/g, " ").split(" ");

        // 过滤掉空的搜索条件并使用 Set 存储唯一的关键词
        const uniqueKeywordsSet = new Set(
            keywords.filter((keyword) => keyword.length > 0),
        );

        // 将 Set 转换为数组
        lastKeywords = Array.from(uniqueKeywordsSet);
        // console.log("handleDocumetnSearchInput lastKeywords : ", lastKeywords);

        searchBlockByKeywords(lastKeywords);
    }

    async function searchBlockByKeywords(keywords: string[]) {
        if (!keywords || keywords.length <= 0) {
            searchResults = [];
            return;
        }
        isSearching = true;
        let sql = generateDocumentSearchSql(keywords);
        let queryBlocks: Block[] = await query(sql);
        processSearchResults(queryBlocks);
        isSearching = false;
    }

    function processSearchResults(blocks: Block[]) {
        searchResults = [];
        if (!blocks) {
            blocks = [];
        }
        searchBlockCount = blocks.length;
        const documentBlockMap: Map<string, DocumentSearchResultItem> =
            new Map();

        // 处理文档块层级
        for (const block of blocks) {
            if (!block) {
                continue;
            }
            let htmlContent = getHighlightedContent(block.content);
            let rootId = block.root_id;

            let documentItem = new DocumentSearchResultItem();
            documentItem.block = block;
            documentItem.subItems = [];
            documentItem.isCollapsed = true;
            documentItem.htmlContent = htmlContent;

            let curParentItem: DocumentSearchResultItem = null;
            if (documentBlockMap.has(rootId)) {
                curParentItem = documentBlockMap.get(rootId);
            } else {
                curParentItem = new DocumentSearchResultItem();
            }

            if (block.type === "d") {
                if (curParentItem.subItems) {
                    documentItem.subItems = curParentItem.subItems;
                }

                if (searchBlockCount > maxExpandCount) {
                    documentItem.isCollapsed = true;
                } else {
                    if (block.content === htmlContent) {
                        documentItem.isCollapsed = false;
                    }
                }
                searchResults.push(documentItem);
                documentBlockMap.set(rootId, documentItem);
            } else {
                curParentItem.subItems.push(documentItem);
            }
        }
    }

    function getHighlightedContent(content: string) {
        let highlightedContent: string = escapeHtml(content);

        if (lastKeywords) {
            highlightedContent = highlightMatches(
                lastKeywords,
                highlightedContent,
            );
        }
        return highlightedContent;
    }

    function highlightMatches(array: string[], searchString: string) {
        if (!array.length || !searchString) {
            return searchString; // 返回原始字符串，因为没有需要匹配的内容
        }

        const regexPattern = new RegExp(`(${array.join("|")})`, "gi");
        const highlightedString = searchString.replace(
            regexPattern,
            "<mark>$1</mark>",
        );
        return highlightedString;
    }

    function escapeHtml(input: string): string {
        const escapeMap: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return input.replace(/[&<>"']/g, (match) => escapeMap[match]);
    }

    function clickItem(block: Block) {
        console.log("search-home clickItem : ", block);
        let blockId = block.id;

        if (!showPreview) {
            openBlockTab(blockId);
        } else {
            itemClickCount++;
            if (itemClickCount === 1) {
                // 单击逻辑
                setTimeout(() => {
                    if (itemClickCount === 1) {
                        refreshBlockPreviewBox(blockId);
                    }
                    itemClickCount = 0; // 重置计数
                }, 180); // 设置一个合适的时间阈值
            } else if (itemClickCount === 2) {
                openBlockTab(blockId);
            }
        }
    }

    function openBlockTab(blockId: string) {
        let actions = [
            "cb-get-hl",
            "cb-get-focus",
            "cb-get-context",
            "cb-get-rootscroll",
        ];
        if (isMobile === true) {
            openMobileFileById(app, blockId, actions);
        } else {
            openTab({
                app: app,
                doc: {
                    id: blockId,
                    action: actions,
                    zoomIn: false,
                },
            });
        }
        itemClickCount = 0; // 重置计数
    }

    function refreshBlockPreviewBox(blockId: string) {
        new Protyle(app, previewDiv, {
            action: [
                "cb-get-hl",
                "cb-get-focus",
                "cb-get-context",
                "cb-get-rootscroll",
            ],
            blockId: blockId,
            defId: blockId,
        });
    }

    function toggleCollpsedItem(isCollapsed: boolean) {
        if (!isCollapsed) {
            if (searchBlockCount > maxExpandCount) {
                showMessage(
                    `当前搜索结果超过 ${maxExpandCount} 条，不允许全部展开！`,
                    5000,
                    "error",
                );
                return;
            }
        }

        for (const item of searchResults) {
            if (
                !item ||
                !item.block ||
                !item.subItems ||
                item.subItems.length <= 0
            ) {
                continue;
            }
            item.isCollapsed = isCollapsed;
        }
        searchResults = searchResults;
    }
</script>

<div class="b3-dialog__content">
    <div class="b3-form__icon search__header">
        <div style="position: relative" class="fn__flex-1">
            <span
                class="search__history-icon"
                id="searchHistoryBtn"
                on:click={searchHidtoryBtnClick}
                on:keypress={handleKeyPress}
                aria-label="Alt+↓"
            >
                <svg data-menu="true" class="b3-form__icon-icon">
                    <use xlink:href="#iconSearch"></use>
                </svg>
                <svg class="search__arrowdown"
                    ><use xlink:href="#iconDown"></use>
                </svg>
            </span>
            <input
                id="documentSearchInput"
                class="b3-text-field b3-text-field--text"
                style="padding-right: 32px !important;"
                on:input={handleDocumetnSearchInputChange}
                bind:value={searchInputKey}
            />
            <svg
                class="b3-form__icon-clear ariaLabel"
                aria-label="清空"
                style="right: 8px;height:42px"
                on:click|stopPropagation={() => {
                    searchInputKey = "";
                    refreshSearch(searchInputKey);
                }}
                on:keypress={handleKeyPress}
            >
                <use xlink:href="#iconCloseRound"></use></svg
            >
        </div>
        <div class="block__icons">
            <span
                id="searchRefresh"
                aria-label="刷新"
                class="block__icon ariaLabel"
                data-position="9bottom"
                on:click|stopPropagation={() => {
                    refreshSearch(searchInputKey);
                }}
                on:keypress={handleKeyPress}
            >
                <svg><use xlink:href="#iconRefresh"></use></svg>
            </span>
            <span class="fn__space"></span>
            <span
                id="searchFilter"
                aria-label="类型"
                class="block__icon ariaLabel"
                data-position="9bottom"
            >
                <svg><use xlink:href="#iconFilter"></use></svg>
            </span>

            <div class="fn__flex">
                <span class="fn__space"></span>
                <span
                    id="searchExpand"
                    class="block__icon block__icon--show ariaLabel"
                    data-position="9bottom"
                    aria-label="展开"
                    on:click={() => {
                        toggleCollpsedItem(false);
                    }}
                    on:keypress={handleKeyPress}
                >
                    <svg><use xlink:href="#iconExpand"></use></svg>
                </span>
                <span class="fn__space"></span>
                <span
                    id="searchCollapse"
                    class="block__icon block__icon--show ariaLabel"
                    data-position="9bottom"
                    aria-label="折叠"
                    on:click={() => {
                        toggleCollpsedItem(true);
                    }}
                    on:keypress={handleKeyPress}
                >
                    <svg><use xlink:href="#iconContract"></use></svg>
                </span>
            </div>
        </div>
    </div>

    <div
        class="search__layout search__layout--row"
        style="height:{searchResultDivHeight}px;"
    >
        <SearchResultItem {searchResults} clickCallback={clickItem} />
        <div class="search__drag"></div>
        <div
            id="searchPreview"
            class="search__preview protyle fn__flex-1 {showPreview
                ? ''
                : 'fn__none'}"
            bind:this={previewDiv}
        ></div>
    </div>
    <div class="fn__loading fn__loading--top {isSearching ? '' : 'fn__none'}">
        <!-- svelte-ignore a11y-missing-attribute -->
        <img width="120px" src="/stage/loading-pure.svg" />
    </div>
</div>
