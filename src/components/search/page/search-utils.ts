import { DocumentItem, BlockItem, DocumentSqlQueryModel } from "@/config/search-model";
import { DocumentQueryCriteria, generateDocumentSearchSql } from "@/services/search-sql";
import { SettingConfig } from "@/services/setting-config";
import { checkBlockFold, getBlockIndex, getBlocksIndexes, lsNotebooks, sql } from "@/utils/api";
import { convertIalStringToObject, convertIconInIal } from "@/utils/icons";
import { Constants, TProtyleAction } from "siyuan";



export async function getDocumentSearchResult(searchKey: string, pageNum: number): Promise<DocumentSqlQueryModel> {
    // 去除多余的空格，并将输入框的值按空格分割成数组
    let keywords = searchKey.trim().replace(/\s+/g, " ").split(" ");

    // 过滤掉空的搜索条件并使用 Set 存储唯一的关键词
    const uniqueKeywordsSet = new Set(
        keywords.filter((keyword) => keyword.length > 0),
    );

    // 将 Set 转换为数组
    keywords = Array.from(uniqueKeywordsSet);

    let result = new DocumentSqlQueryModel();

    if (!keywords || keywords.length <= 0) {
        result.status = "param_null";
        return result;
    }

    let pageSize = SettingConfig.ins.pageSize;
    let types = SettingConfig.ins.includeTypes;
    let queryFields = SettingConfig.ins.includeQueryFields;
    let excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;
    let pages = [pageNum, pageSize];
    let documentSortMethod = SettingConfig.ins.documentSortMethod;
    let contentBlockSortMethod = SettingConfig.ins.contentBlockSortMethod;

    let documentSearchCriterion: DocumentQueryCriteria =
        new DocumentQueryCriteria(
            keywords,
            pages,
            documentSortMethod,
            contentBlockSortMethod,
            types,
            queryFields,
            excludeNotebookIds,
        );

    let documentSearchSql = generateDocumentSearchSql(
        documentSearchCriterion,
    );
    let documentSearchResults: any[] = await sql(documentSearchSql);
    let documentItems: DocumentItem[] = await processSearchResults(
        documentSearchResults,
        documentSearchCriterion,
    );

    let documentCount: number;
    if (documentSearchResults && documentSearchResults[0]) {
        documentCount = documentSearchResults[0].documentCount;;
    }

    result.searchCriterion = documentSearchCriterion;
    result.documentItems = documentItems;
    result.documentCount = documentCount;
    result.status = "success";

    return result;
}

export function handleSearchDragMousdown(event: MouseEvent) {
    /* 复制 https://vscode.dev/github/siyuan-note/siyuan/blob/master/app/src/search/util.ts#L407
        #genSearch 方法下的 const dragElement = element.querySelector(".search__drag"); 处
    */

    const dragElement = event.target as Element;
    const documentSelf = document;
    const nextElement = dragElement.nextElementSibling as HTMLElement;
    const previousElement =
        dragElement.previousElementSibling as HTMLElement;
    const direction = "lr";
    // window.siyuan.storage[Constants.LOCAL_SEARCHKEYS][
    //     closeCB ? "layout" : "layoutTab"
    // ] === 1
    //     ? "lr"
    //     : "tb";
    const x = event[direction === "lr" ? "clientX" : "clientY"];
    const previousSize =
        direction === "lr"
            ? previousElement.clientWidth
            : previousElement.clientHeight;
    const nextSize =
        direction === "lr"
            ? nextElement.clientWidth
            : nextElement.clientHeight;

    nextElement.classList.remove("fn__flex-1");
    nextElement.style[direction === "lr" ? "width" : "height"] =
        nextSize + "px";

    documentSelf.onmousemove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        const previousNowSize =
            previousSize +
            (moveEvent[direction === "lr" ? "clientX" : "clientY"] - x);
        const nextNowSize =
            nextSize -
            (moveEvent[direction === "lr" ? "clientX" : "clientY"] - x);
        if (previousNowSize < 120 || nextNowSize < 120) {
            return;
        }
        nextElement.style[direction === "lr" ? "width" : "height"] =
            nextNowSize + "px";
    };

    documentSelf.onmouseup = () => {
        documentSelf.onmousemove = null;
        documentSelf.onmouseup = null;
        documentSelf.ondragstart = null;
        documentSelf.onselectstart = null;
        documentSelf.onselect = null;
        // window.siyuan.storage[Constants.LOCAL_SEARCHKEYS][
        //     direction === "lr"
        //         ? closeCB
        //             ? "col"
        //             : "colTab"
        //         : closeCB
        //           ? "row"
        //           : "rowTab"
        // ] =
        //     nextElement[
        //         direction === "lr" ? "clientWidth" : "clientHeight"
        //     ] + "px";
        // setStorageVal(
        //     Constants.LOCAL_SEARCHKEYS,
        //     window.siyuan.storage[Constants.LOCAL_SEARCHKEYS],
        // );
        // if (direction === "lr") {
        //     resize(edit.protyle);
        // }
    };
}



export function getNodeId(node: Node | null): string | null {
    if (!node) {
        return null;
    }
    if (node instanceof Element) {
        const nodeId = (node as HTMLElement).getAttribute("data-node-id");
        if (nodeId) {
            return nodeId;
        }
    }
    // 递归查找父节点
    return getNodeId(node.parentNode);
}



export async function getNotebookMap(): Promise<Map<string, Notebook>> {
    let notebookMap: Map<string, Notebook> = new Map();
    let notebooks: Notebook[] = (await lsNotebooks()).notebooks;
    for (const notebook of notebooks) {
        notebookMap.set(notebook.id, notebook);
    }
    return notebookMap;
}


export async function processSearchResults(
    blocks: Block[],
    documentSearchCriterion: DocumentQueryCriteria
): Promise<DocumentItem[]> {
    const startTime = performance.now(); // 记录开始时间

    let searchResults: DocumentItem[] = [];
    if (!blocks) {
        blocks = [];
        return searchResults;
    }
    let keywords = documentSearchCriterion.keywords;
    let documentSortMethod = documentSearchCriterion.documentSortMethod;
    let contentBlockSortMethod = documentSearchCriterion.contentBlockSortMethod;
    let notebookMap = await getNotebookMap();

    const documentBlockMap: Map<string, DocumentItem> =
        new Map();

    for (const block of blocks) {
        if (!block) {
            continue;
        }

        highlightBlockContent(block, keywords);

        let rootId = block.root_id;
        let documentItem = new DocumentItem();
        documentItem.block = block;
        documentItem.subItems = [];
        documentItem.isCollapsed = true;

        let curParentItem: DocumentItem = null;
        if (documentBlockMap.has(rootId)) {
            curParentItem = documentBlockMap.get(rootId);
        } else {
            curParentItem = new DocumentItem();
            curParentItem.subItems = [];
            documentBlockMap.set(rootId, curParentItem);
        }

        curParentItem.subItems.push(documentItem);

        if (block.type === "d") {
            if (curParentItem.subItems) {
                documentItem.subItems = curParentItem.subItems;
            }
            if (blocks.length > SettingConfig.ins.maxExpandCount) {
                documentItem.isCollapsed = true;
            } else {
                documentItem.isCollapsed = false;
            }
            if (block.ial) {
                let ial = convertIalStringToObject(block.ial);
                documentItem.icon = convertIconInIal(ial.icon);
            }
            documentItem.path =
                notebookMap.get(block.box).name + block.hpath;
            searchResults.push(documentItem);
            documentBlockMap.set(rootId, documentItem);
        }
    }

    // 文档排序
    documentSort(searchResults, documentSortMethod);
    // let documentSortFun = getDocumentSortFun(documentSortMethod);
    // searchResults.sort(documentSortFun);

    let index = 0;
    for (const item of searchResults) {
        // 是否隐藏文档快
        if (!SettingConfig.ins.showChildDocument) {
            if (item.subItems.length > 1) {
                let documentItemIndex = 0;
                for (let i: number = 0; i < item.subItems.length; i++) {
                    let subItem = item.subItems[i];
                    if (subItem.block.type === "d") {
                        documentItemIndex = i;
                        break;
                    }
                }
                item.subItems.splice(documentItemIndex, 1);
            }
        }
        item.index = index;
        for (const subItem of item.subItems) {
            if (item.block.id === subItem.block.id) {
                continue;
            }
            index++;
            subItem.index = index;
        }
        index++;

        // 块排序，目前主要处理原文排序，其他顺序已经在mysql中排序过了。
        // 粗略测试觉得 sqlite 中的排序效率更高，可能有索引优化的原因。
        if (contentBlockSortMethod == "content") {
            await blockItemsSort(item.subItems, contentBlockSortMethod, item.index + 1);
        }
    }

    const endTime = performance.now(); // 记录结束时间
    const executionTime = endTime - startTime; // 计算时间差
    console.log(
        `处理数据消耗 : ${executionTime} ms`,
    );
    return searchResults;
}

function documentSort(searchResults: DocumentItem[], documentSortMethod: string) {
    // 文档排序
    let documentSortFun = getDocumentSortFun(documentSortMethod);
    searchResults.sort(documentSortFun);
}

function getDocumentSortFun(documentSortMethod: string)
    : (
        a: DocumentItem,
        b: DocumentItem,
    ) => number {
    let documentSortFun: (
        a: DocumentItem,
        b: DocumentItem,
    ) => number;

    switch (documentSortMethod) {
        case "type":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = bRank - aRank;
                result =
                    result == 0
                        ? Number(b.block.updated) - Number(a.block.updated)
                        : result;
                return result;
            };
            break;
        case "modifiedAsc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(a.block.updated) - Number(b.block.updated);
            };
            break;
        case "modifiedDesc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(b.block.updated) - Number(a.block.updated);
            };
            break;
        case "createdAsc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(a.block.created) - Number(b.block.created);
            };
            break;
        case "createdDesc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(b.block.created) - Number(a.block.created);
            };
            break;
        case "rankAsc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = aRank - bRank;
                result =
                    result == 0
                        ? Number(b.block.updated) - Number(a.block.updated)
                        : result;
                return result;
            };
            break;
        case "rankDesc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = bRank - aRank;
                result =
                    result == 0
                        ? Number(b.block.updated) - Number(a.block.updated)
                        : result;
                return result;
            };
            break;
    }
    return documentSortFun;
}


export async function blockItemsSort(
    blockItems: BlockItem[],
    contentBlockSortMethod: string,
    startIndex: number,) {
    if (contentBlockSortMethod == "content") {
        await searchItemSortByContent(blockItems);
    } else {
        let blockSortFun: (
            a: BlockItem,
            b: BlockItem,
        ) => number = getBlockSortFun(contentBlockSortMethod);
        if (blockSortFun) {
            blockItems.sort(blockSortFun);
        }
    }
    // 排序后再处理一下搜索结果中的索引，用来上下键选择。
    let index = startIndex;
    for (const item of blockItems) {
        item.index = index;
        index++;
    }
}

function getBlockSortFun(contentBlockSortMethod: string) {
    let blockSortFun: (
        a: BlockItem,
        b: BlockItem,
    ) => number;
    switch (contentBlockSortMethod) {
        case "type":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                let aSort: number = Number(a.block.sort);
                let bSort: number = Number(b.block.sort);
                let result = aSort - bSort;
                if (result == 0) {
                    let aRank: number = a.block.content.split("<mark>").length - 1;
                    let bRank: number = b.block.content.split("<mark>").length - 1;
                    result = bRank - aRank;
                }

                return result;
            };
            break;
        case "modifiedAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                return Number(a.block.updated) - Number(b.block.updated);
            };
            break;
        case "modifiedDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                return Number(b.block.updated) - Number(a.block.updated);
            };
            break;
        case "createdAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                return Number(a.block.created) - Number(b.block.created);
            };
            break;
        case "createdDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                return Number(b.block.created) - Number(a.block.created);
            };
            break;
        case "rankAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = aRank - bRank;
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "rankDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                let aRank: number = a.block.content.split("<mark>").length - 1;
                let bRank: number = b.block.content.split("<mark>").length - 1;
                let result = bRank - aRank;
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated)
                }
                return result;
            };
            break;
    }
    return blockSortFun;

}

function highlightBlockContent(block: Block, keywords: string[]) {
    if (!block) {
        return;
    }
    let contentHtml = getHighlightedContent(block.content, keywords);
    let nameHml = getHighlightedContent(block.name, keywords);
    let aliasHtml = getHighlightedContent(block.alias, keywords);
    let memoHtml = getHighlightedContent(block.memo, keywords);
    block.content = contentHtml;
    block.name = nameHml;
    block.alias = aliasHtml;
    block.memo = memoHtml;
}

function getHighlightedContent(
    content: string,
    keywords: string[],
): string {
    if (!content) {
        return content;
    }
    let highlightedContent: string = escapeHtml(content);

    if (keywords) {
        highlightedContent = highlightMatches(highlightedContent, keywords);
    }
    return highlightedContent;
}

function highlightMatches(content: string, keywords: string[]): string {
    if (!keywords.length || !content) {
        return content; // 返回原始字符串，因为没有需要匹配的内容
    }

    const regexPattern = new RegExp(`(${keywords.join("|")})`, "gi");
    const highlightedString = content.replace(
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


function countKeywords(content: string, keywords: string[]): number {
    let count = 0;
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi'); // 创建全局、不区分大小写的正则表达式
        const matches = content.match(regex); // 在文本中查找匹配的关键字
        if (matches) {
            count += matches.length; // 更新匹配关键字的数量
        }
    });
    return count;
}


export async function getOpenTabAction(blockId: string): Promise<TProtyleAction[]> {
    let zoomIn = await checkBlockFold(blockId)
    let actions: TProtyleAction[] = zoomIn
        ? [
            Constants.CB_GET_HL,
            Constants.CB_GET_FOCUS,
            Constants.CB_GET_ALL,
        ]
        : [
            Constants.CB_GET_HL,
            Constants.CB_GET_FOCUS,
            Constants.CB_GET_CONTEXT,
            Constants.CB_GET_ROOTSCROLL,
        ];
    return actions;
}

export async function getProtyleAction(blockId: string): Promise<TProtyleAction[]> {
    let zoomIn = await checkBlockFold(blockId)
    let actions: TProtyleAction[] = zoomIn
        ? [
            Constants.CB_GET_HL,
            Constants.CB_GET_ALL,
        ]
        : [
            Constants.CB_GET_HL,
            Constants.CB_GET_CONTEXT,
            Constants.CB_GET_ROOTSCROLL,
        ];
    return actions;
}

export function toggleAllCollpsedItem(documentItems: DocumentItem[], isCollapsed: boolean) {
    if (!documentItems) {
        return;
    }
    for (const item of documentItems) {
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
    documentItems = documentItems;
}

export function selectItemByArrowKeys(
    event: KeyboardEvent, selectedItemIndex: number, documentItems: DocumentItem[]): BlockItem {
    let selectedItem: BlockItem = null;

    if (!event || !event.key) {
        return selectedItem;
    }
    let keydownKey = event.key;
    if (
        keydownKey !== "ArrowUp" &&
        keydownKey !== "ArrowDown" &&
        keydownKey !== "Enter"
    ) {
        return selectedItem;
    }
    event.stopPropagation();

    if (event.key === "ArrowUp") {
        if (selectedItemIndex > 0) {
            selectedItemIndex -= 1;
        }
    } else if (event.key === "ArrowDown") {
        let lastSubItems = documentItems[documentItems.length - 1].subItems;
        let lastIndex = documentItems[documentItems.length - 1].index;
        if (lastSubItems && lastSubItems.length > 0) {
            lastIndex = lastSubItems[lastSubItems.length - 1].index;
        }
        if (selectedItemIndex < lastIndex) {
            selectedItemIndex += 1;
        }
    }
    for (const item of documentItems) {
        if (selectedItemIndex == item.index) {
            selectedItem = item;
            break;
        }
        for (const subItem of item.subItems) {
            if (selectedItemIndex == subItem.index) {
                selectedItem = subItem;
                break;
            }
        }
    }

    return selectedItem;
}

type HighlightCallback = (matchFocusRange: Range) => void;

export async function highlightElementTextByCss(
    contentElement: HTMLElement,
    keywords: string[],
    targetBlockId: string,
    nextMatchFocusIndex: number,
    callback: HighlightCallback,
) {
    if (!contentElement || !keywords) {
        return;
    }
    // If the CSS Custom Highlight API is not supported,
    // display a message and bail-out.
    if (!CSS.highlights) {
        console.log("CSS Custom Highlight API not supported.");
        return;
    }

    // Find all text nodes in the article. We'll search within
    // these text nodes.
    const treeWalker = document.createTreeWalker(
        contentElement,
        NodeFilter.SHOW_TEXT,
    );
    const allTextNodes: Node[] = [];
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
        allTextNodes.push(currentNode);
        currentNode = treeWalker.nextNode();
    }

    // Clear the HighlightRegistry to remove the
    // previous search results.
    clearCssHighlights();

    // Clean-up the search query and bail-out if
    // if it's empty.

    let allMatchRanges: Range[] = [];
    let targetElementMatchRanges: Range[] = [];

    // Iterate over all text nodes and find matches.
    allTextNodes
        .map((el: Node) => {
            return { el, text: el.textContent.toLowerCase() };
        })
        .map(({ el, text }) => {
            const indices: { index: number; length: number }[] = [];
            for (const queryStr of keywords) {
                if (!queryStr) {
                    continue;
                }
                let startPos = 0;
                while (startPos < text.length) {
                    const index = text.indexOf(
                        queryStr.toLowerCase(),
                        startPos,
                    );
                    if (index === -1) break;
                    let length = queryStr.length;
                    indices.push({ index, length });
                    startPos = index + length;
                }
            }

            indices
                .sort((a, b) => a.index - b.index)
                .map(({ index, length }) => {
                    const range = new Range();
                    range.setStart(el, index);
                    range.setEnd(el, index + length);
                    allMatchRanges.push(range);
                    if (getNodeId(el) == targetBlockId) {
                        targetElementMatchRanges.push(range);
                    }
                });
        });

    // Create a Highlight object for the ranges.
    allMatchRanges = allMatchRanges.flat();
    if (!allMatchRanges || allMatchRanges.length <= 0) {
        return;
    }
    let matchFocusRange: Range;
    let nextMatchIndexRemainder =
        nextMatchFocusIndex % targetElementMatchRanges.length;
    for (let i = 0; i < targetElementMatchRanges.length; i++) {
        if (i == nextMatchIndexRemainder) {
            matchFocusRange = targetElementMatchRanges[i];
            break;
        }
    }

    allMatchRanges = allMatchRanges.filter(
        (obj) => obj !== matchFocusRange,
    );

    const searchResultsHighlight = new Highlight(...allMatchRanges);

    // Register the Highlight object in the registry.
    CSS.highlights.set("search-result-mark", searchResultsHighlight);

    if (matchFocusRange) {
        CSS.highlights.set(
            "search-result-focus",
            new Highlight(matchFocusRange),
        );
    }

    callback(matchFocusRange);
}

export function clearCssHighlights() {
    CSS.highlights.delete("search-result-mark");
    CSS.highlights.delete("search-result-focus");

}




async function searchItemSortByContent(blockItems: BlockItem[]) {
    const startTime = performance.now(); // 记录开始时间

    let ids = blockItems.map(item => item.block.id);
    let idMap: Map<BlockId, number> = await getBatchBlockIdIndex(ids);
    blockItems.sort((a, b) => {
        let aIndex = idMap.get(a.block.id) || 0;
        let bIndex = idMap.get(b.block.id) || 0;
        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        } else {
            return a.block.sort - b.block.sort;
        }
    });

    const endTime = performance.now(); // 记录结束时间
    const executionTime = endTime - startTime; // 计算时间差
    console.log(
        `原文排序消耗时长 : ${executionTime} ms`,
    );
    return blockItems;
}



async function getBatchBlockIdIndex(ids: string[]): Promise<Map<BlockId, number>> {
    let idObject = await getBlocksIndexes(ids);
    let idMap: Map<string, number> = new Map();

    // 遍历对象的键值对，并将它们添加到 Map 中
    for (const key in idObject) {
        if (Object.prototype.hasOwnProperty.call(idObject, key)) {
            const value = idObject[key];
            idMap.set(key, value);
        }
    }


    // let idMap: Map<string, number> = new Map();
    // for (const id of ids) {
    //     let index = 0
    //     try {
    //         index = await getBlockIndex(id);
    //     } catch (err) {
    //         console.error("获取块索引报错 : ", err)
    //     }
    //     idMap.set(id, index)
    // }
    return idMap;
}


export function delayedTwiceRefresh(executeFun: () => void, firstTimeout: number) {
    if (!executeFun) {
        return;
    }
    if (!firstTimeout) {
        firstTimeout = 0;
    }
    let refreshPreviewHighlightTimeout =
        SettingConfig.ins.refreshPreviewHighlightTimeout;
    setTimeout(() => {
        executeFun();

        // 延迟刷新一次，目前用于代码块、数据库块内容高亮
        if (
            refreshPreviewHighlightTimeout &&
            refreshPreviewHighlightTimeout > 0
        ) {
            setTimeout(() => {
                executeFun();
            }, refreshPreviewHighlightTimeout);
        }

    }, firstTimeout);
}


// 查找包含指定元素的最近的滚动容器
export function findScrollingElement(element: HTMLElement): HTMLElement | null {
    let parentElement = element.parentElement;
    while (parentElement) {
        if (parentElement.scrollHeight > parentElement.clientHeight) {
            return parentElement; // 找到第一个具有滚动条的父级元素
        }
        parentElement = parentElement.parentElement;
    }
    return null; // 没有找到具有滚动条的父级元素
}