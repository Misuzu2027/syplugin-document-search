import { DocumentItem, BlockItem, DocumentSqlQueryModel, BlockCriteria as CustomBlockCriteria, CompareCondition } from "@/config/search-model";
import { SETTING_CONTENT_BLOCK_SORT_METHOD_ELEMENT } from "@/config/setting-constant";
import { DocumentQueryCriteria, generateDocumentSearchSql } from "@/services/search-sql";
import { SettingConfig } from "@/services/setting-config";
import { getBlockIsFolded, getBlockIndex, getBlocksIndexes, sql, getNotebookMapByApi } from "@/utils/api";
import { highlightBlockContent } from "@/utils/html-util";
import { getDocIconHtmlByIal } from "@/utils/icon-util";
import { getObjectSizeInKB } from "@/utils/object-util";
import { Constants, TProtyleAction } from "siyuan";
import { getFileArialLabel } from "@/components/doc-tree/doc-tree-util";
import { isNumberValid } from "@/utils/number-util";
import { isStrBlank, isStrEmpty, isStrNotBlank, isStrNotEmpty, splitKeywordStringToArray } from "@/utils/string-util";
import { isArrayNotEmpty, arrayRemoveValue } from "@/utils/array-util";
import { EnvConfig } from "@/config/env-config";



export async function getDocumentSearchResult(documentSearchCriterion: DocumentQueryCriteria): Promise<DocumentSqlQueryModel> {
    const startTime = performance.now(); // 记录开始时间
    let result = new DocumentSqlQueryModel();

    if (!documentSearchCriterion) {
        result.status = "param_null";
        return result;
    }

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

    const endTime = performance.now(); // 记录结束时间
    const executionTime = endTime - startTime; // 计算时间差
    console.log(
        `获取和处理搜索结果消耗时间 : ${executionTime} ms, 内容大小 : ${getObjectSizeInKB(documentItems)}`,
    );
    return result;
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

let bgFadeTimeoutId: NodeJS.Timeout;
let lastBgFadeElement: Element;

export function bgFade(element: Element) {
    if (bgFadeTimeoutId) {
        clearTimeout(bgFadeTimeoutId);
        bgFadeTimeoutId = null;
    }
    if (lastBgFadeElement) {
        lastBgFadeElement.classList.remove("protyle-wysiwyg--hl");
    }
    element.parentElement.querySelectorAll(".protyle-wysiwyg--hl").forEach((hlItem) => {
        hlItem.classList.remove("protyle-wysiwyg--hl");
    });
    element.classList.add("protyle-wysiwyg--hl");
    bgFadeTimeoutId = setTimeout(function () {
        element.classList.remove("protyle-wysiwyg--hl");
    }, 1536);
    lastBgFadeElement = element;
};

export function getRangeByElement(element: Element): Range {
    if (!element) {
        return;
    }
    let elementRange = document.createRange();
    elementRange.selectNodeContents(element);
    return elementRange;
}


// export async function getNotebookMapByApi(showClosed: boolean): Promise<Map<string, Notebook>> {
//     let notebookMap: Map<string, Notebook> = new Map();
//     let notebooks: Notebook[] = (await lsNotebooks()).notebooks;
//     for (const notebook of notebooks) {
//         if (!showClosed && notebook.closed) {
//             continue;
//         }
//         notebook.icon = getNotebookIcon(notebook.icon);
//         notebookMap.set(notebook.id, notebook);
//     }
//     return notebookMap;
// }


export async function processSearchResults(
    blocks: Block[],
    documentSearchCriterion: DocumentQueryCriteria
): Promise<DocumentItem[]> {

    let searchResults: DocumentItem[] = [];
    if (!blocks) {
        blocks = [];
        return searchResults;
    }
    let keywords = documentSearchCriterion.includeKeywords;
    let documentSortMethod = documentSearchCriterion.documentSortMethod;
    let contentBlockSortMethod = documentSearchCriterion.contentBlockSortMethod;
    let notebookMap = await getNotebookMapByApi(true);

    const documentBlockMap: Map<string, DocumentItem> =
        new Map();

    for (const block of blocks) {
        if (!block) {
            continue;
        }

        highlightBlockContent(block, keywords);

        let rootId = block.root_id;
        let blockItem = new BlockItem();
        blockItem.block = block;

        let tempParentItem: DocumentItem = null;
        if (documentBlockMap.has(rootId)) {
            tempParentItem = documentBlockMap.get(rootId);
        } else {
            tempParentItem = new DocumentItem();
            tempParentItem.subItems = [];
            documentBlockMap.set(rootId, tempParentItem);
        }

        tempParentItem.subItems.push(blockItem);

        if (block.type === "d") {
            let documentItem = new DocumentItem();
            documentItem.block = block;
            documentItem.subItems = [];

            let subItems = tempParentItem.subItems;
            if (subItems) {
                // 让文档块始终在第一个。
                let documentBlockItem = subItems.pop()
                subItems.unshift(documentBlockItem);
                documentItem.subItems = subItems;
            }

            if (blocks.length > SettingConfig.ins.maxExpandCount) {
                documentItem.isCollapsed = true;
            } else {
                documentItem.isCollapsed = false;
            }
            documentItem.icon = getDocIconHtmlByIal(block.ial);
            // if (block.ial) {
            //     let ial = convertIalStringToObject(block.ial);
            //     documentItem.icon = convertIconInIal(ial.icon);
            // }
            // if (isStrBlank(documentItem.icon)) {
            //     const LOCAL_IMAGES = "local-images";
            //     let fileIcon = window.siyuan.storage[LOCAL_IMAGES].file;
            //     documentItem.icon = convertIconInIal(fileIcon);
            // }

            let notebookInfo = notebookMap.get(block.box);
            let boxName = block.box;
            if (notebookInfo) {
                boxName = notebookInfo.name;
            }

            documentItem.ariaLabel = getFileArialLabel(block, boxName);
            searchResults.push(documentItem);
            documentBlockMap.set(rootId, documentItem);
        }
    }

    if (SettingConfig.ins.alwaysExpandSingleDoc && searchResults.length == 1) {
        searchResults[0].isCollapsed = false;
    }

    // 文档排序
    documentSort(searchResults, documentSortMethod);
    // let documentSortFun = getDocumentSortFun(documentSortMethod);
    // searchResults.sort(documentSortFun);

    let index = 0;
    for (const documentItem of searchResults) {
        // 是否隐藏文档快
        if (!SettingConfig.ins.showChildDocument) {
            if (documentItem.subItems.length > 1) {
                let documentItemIndex = 0;
                for (let i: number = 0; i < documentItem.subItems.length; i++) {
                    let subItem = documentItem.subItems[i];
                    if (subItem.block.type === "d") {
                        documentItemIndex = i;
                        break;
                    }
                }
                documentItem.subItems.splice(documentItemIndex, 1);
            }
        }
        documentItem.index = index;
        for (const subItem of documentItem.subItems) {
            if (documentItem.block.id !== subItem.block.id) {
                index++;
            }
            subItem.index = index;
        }
        index++;

        // 块排序，目前主要处理原文排序，其他顺序已经在 mysql 中排序过了。
        // 粗略测试觉得 sqlite 中的排序效率更高，可能有索引优化的原因。
        if (contentBlockSortMethod == "content"
            || contentBlockSortMethod == "typeAndContent"
            // || contentBlockSortMethod == "rankAsc"
            // || contentBlockSortMethod == "rankDesc"
        ) {
            await blockItemsSort(documentItem.subItems, contentBlockSortMethod, documentItem.index);
        }
    }

    return searchResults;
}


export function getDocumentQueryCriteria(
    searchKey: string,
    docFullTextSearch: boolean,
    // includeNotebookIds: string[],
    pageNum: number): DocumentQueryCriteria {
    if (isStrBlank(searchKey)) {
        return null;
    }

    let blockCriteria = parseSearchCustomKeyword(searchKey);
    if (!blockCriteria) {
        return null;
    }

    // let docFullTextSearch = SettingConfig.ins.flatDocFullTextSearch;
    let pageSize = SettingConfig.ins.pageSize;
    let types = SettingConfig.ins.includeTypes;
    let queryFields = SettingConfig.ins.includeQueryFields;
    let pages = [pageNum, pageSize];
    let documentSortMethod = SettingConfig.ins.documentSortMethod;
    let contentBlockSortMethod = SettingConfig.ins.contentBlockSortMethod;

    let blockKeyWordConditionArray = blockCriteria.blockKeyWordConditionArray;

    let includeKeywords = [];
    let excludeKeywords = [];


    for (const condition of blockKeyWordConditionArray) {
        includeKeywords.push(...condition.include);
        excludeKeywords.push(...condition.exclude);
        if (isStrNotBlank(condition.type) && !types.includes(condition.type)) {
            types.push(condition.type);
        }
    }

    // for (const pathKeyword of blockCriteria?.path?.include) {
    //     includeKeywords.push(pathKeyword);
    // }


    const notebookIncludeKeywordArray = blockCriteria?.notebook?.include || [];
    const notebookExcludeKeywordArray = blockCriteria?.notebook?.exclude || [];
    let includeNotebookIds: string[] = [];
    let excludeNotebookIds = SettingConfig.ins.excludeNotebookIds;

    if (isArrayNotEmpty(notebookIncludeKeywordArray)) {
        includeNotebookIds = filterNotebookIds(notebookIncludeKeywordArray);
    }
    if (isArrayNotEmpty(includeNotebookIds)) {
        excludeNotebookIds = excludeNotebookIds.filter(id => !includeNotebookIds.includes(id));
    }

    if (isArrayNotEmpty(notebookExcludeKeywordArray)) {
        excludeNotebookIds = filterNotebookIds(notebookExcludeKeywordArray);
    }


    let documentSearchCriterion: DocumentQueryCriteria =
        new DocumentQueryCriteria(
            includeKeywords,
            excludeKeywords,
            blockCriteria?.blockKeyWordConditionArray,
            blockCriteria?.path?.include,
            blockCriteria?.path?.exclude,
            blockCriteria?.createdTimeArray,
            blockCriteria?.updatedTimeArray,
            docFullTextSearch,
            pages,
            documentSortMethod,
            contentBlockSortMethod,
            types,
            queryFields,
            includeNotebookIds,
            excludeNotebookIds,
        );

    return documentSearchCriterion;
}

function documentSort(searchResults: DocumentItem[], documentSortMethod: DocumentSortMethod) {
    // 文档排序
    let documentSortFun = getDocumentSortFun(documentSortMethod);
    searchResults.sort(documentSortFun);
}

function getDocumentSortFun(documentSortMethod: DocumentSortMethod)
    : (
        a: DocumentItem,
        b: DocumentItem,
    ) => number {
    let documentSortFun: (
        a: DocumentItem,
        b: DocumentItem,
    ) => number;

    switch (documentSortMethod) {
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
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = aRank - bRank;
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "rankDesc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = bRank - aRank;
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "alphabeticAsc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = aContent.localeCompare(bContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "alphabeticDesc":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = bContent.localeCompare(aContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
    }
    return documentSortFun;
}


export async function blockItemsSort(
    blockItems: BlockItem[],
    contentBlockSortMethod: ContentBlockSortMethod,
    startIndex: number,) {
    if (!blockItems || blockItems.length <= 0) {
        return;
    }
    if (contentBlockSortMethod == "content") {
        await searchItemSortByContent(blockItems);
    } else if (contentBlockSortMethod == "typeAndContent") {
        await searchItemSortByTypeAndContent(blockItems);
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
    if (blockItems[0].block.type != "d") {
        index++;
    }
    for (const item of blockItems) {
        item.index = index;
        index++;
    }
}

function getBlockSortFun(contentBlockSortMethod: ContentBlockSortMethod) {
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
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let result = a.block.sort - b.block.sort;
                if (result == 0) {
                    let aRank: number = calculateBlockRank(a.block);
                    let bRank: number = calculateBlockRank(b.block);
                    result = bRank - aRank;
                }
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }

                return result;
            };
            break;
        case "modifiedAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(a.block.updated) - Number(b.block.updated);
            };
            break;
        case "modifiedDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(b.block.updated) - Number(a.block.updated);
            };
            break;
        case "createdAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(a.block.created) - Number(b.block.created);
            };
            break;
        case "createdDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(b.block.created) - Number(a.block.created);
            };
            break;
        case "rankAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = aRank - bRank;
                if (result == 0) {
                    result = Number(a.block.sort) - Number(b.block.sort);
                    if (result == 0) {
                        result = Number(b.block.updated) - Number(a.block.updated);
                    }
                }
                return result;
            };
            break;
        case "rankDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = bRank - aRank;
                if (result == 0) {
                    result = Number(a.block.sort) - Number(b.block.sort);
                    if (result == 0) {
                        result = Number(b.block.updated) - Number(a.block.updated);
                    }
                }
                return result;
            };
            break;
        case "alphabeticAsc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = aContent.localeCompare(bContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "alphabeticDesc":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = bContent.localeCompare(aContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
    }
    return blockSortFun;

}


function calculateBlockRank(block: Block): number {
    let includeAttrFields = SettingConfig.ins.includeAttrFields;
    let rank = block.content.split("<mark>").length - 1;

    if (includeAttrFields.includes("name")) {
        rank += block.name.split("<mark>").length - 1;
    }
    if (includeAttrFields.includes("alias")) {
        rank += block.alias.split("<mark>").length - 1;
    }
    if (includeAttrFields.includes("memo")) {
        rank += block.memo.split("<mark>").length - 1;
    }
    return rank;
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
    let zoomIn = await getBlockIsFolded(blockId);

    return getOpenTabActionByZoomIn(zoomIn);
}


export function getOpenTabActionByZoomIn(zoomIn: boolean): TProtyleAction[] {
    let actions: TProtyleAction[] = zoomIn
        ? [
            Constants.CB_GET_HL,
            Constants.CB_GET_FOCUS,
            Constants.CB_GET_ALL,
        ]
        : [
            Constants.CB_GET_HL,
            // Constants.CB_GET_FOCUS,
            Constants.CB_GET_CONTEXT,
            Constants.CB_GET_ROOTSCROLL,
        ];
    return actions;
}

export async function getProtyleAction(blockId: string): Promise<TProtyleAction[]> {
    let zoomIn = await getBlockIsFolded(blockId);

    return getProtyleActionByZoomIn(zoomIn);
}


export function getProtyleActionByZoomIn(zoomIn: boolean): TProtyleAction[] {
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
    event: KeyboardEvent, selectedItemIndex: number, documentItems: DocumentItem[]): DocumentItem | BlockItem {
    let selectedItem: DocumentItem | BlockItem = null;

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
        let lastDocumentItem = documentItems[documentItems.length - 1];
        if (!lastDocumentItem) {
            return selectedItem;
        }
        let lastSubItems = lastDocumentItem.subItems;
        let lastIndex = lastDocumentItem.index;
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


export async function highlightElementTextByCss(
    contentElement: HTMLElement,
    keywords: string[],
    targetBlockId: string,
    nextMatchFocusIndex: number,
): Promise<Range> {
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
                    if (targetBlockId) {
                        if (getNodeId(el) == targetBlockId) {
                            targetElementMatchRanges.push(range);
                        }
                    } else {
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

    let nextMatchIndexRemainder = null;
    if (isNumberValid(nextMatchFocusIndex) && targetElementMatchRanges.length > 0) {
        nextMatchIndexRemainder = nextMatchFocusIndex % targetElementMatchRanges.length;
    }
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
        return matchFocusRange;
    }

    // console.log("highlightElementTextByCss ", matchFocusRange)
    // if (callback) {
    //     callback(matchFocusRange);
    // }
    return;
}

export function clearCssHighlights() {
    CSS.highlights.delete("search-result-mark");
    CSS.highlights.delete("search-result-focus");
}


async function searchItemSortByContent(blockItems: BlockItem[]) {

    let ids = blockItems.map(item => item.block.id);
    let idMap: Map<BlockId, number> = await getBatchBlockIdIndex(ids);
    blockItems.sort((a, b) => {
        if (a.block.type === "d") {
            return -1;
        }
        if (b.block.type === "d") {
            return 1;
        }
        let aIndex = idMap.get(a.block.id) || 0;
        let bIndex = idMap.get(b.block.id) || 0;
        let result = aIndex - bIndex;
        if (result == 0) {
            result = Number(a.block.created) - Number(b.block.created);
        }
        if (result == 0) {
            result = a.block.sort - b.block.sort;
        }
        return result;
    });

    return blockItems;
}


async function searchItemSortByTypeAndContent(blockItems: BlockItem[]) {
    let ids = blockItems.map(item => item.block.id);
    let idMap: Map<BlockId, number> = await getBatchBlockIdIndex(ids);
    blockItems.sort((a, b) => {
        if (a.block.type === "d") {
            return -1;
        }
        if (b.block.type === "d") {
            return 1;
        }
        let result = a.block.sort - b.block.sort;
        if (result == 0) {
            let aIndex = idMap.get(a.block.id) || 0;
            let bIndex = idMap.get(b.block.id) || 0;
            result = aIndex - bIndex;
        }
        if (result == 0) {
            result = Number(a.block.created) - Number(b.block.created);
        }
        return result;
    });

    return blockItems;
}

async function getBatchBlockIdIndex(ids: string[]): Promise<Map<BlockId, number>> {
    let idMap: Map<string, number> = new Map();
    let getSuccess = true;
    try {
        let idObject = await getBlocksIndexes(ids);
        // 遍历对象的键值对，并将它们添加到 Map 中
        for (const key in idObject) {
            if (Object.prototype.hasOwnProperty.call(idObject, key)) {
                const value = idObject[key];
                idMap.set(key, value);
            }
        }
    } catch (err) {
        getSuccess = false;
        console.error("批量获取块索引报错，可能是旧版本不支持批量接口 : ", err)
    }

    if (!getSuccess) {
        for (const id of ids) {
            let index = 0
            try {
                index = await getBlockIndex(id);
            } catch (err) {
                console.error("获取块索引报错 : ", err)
            }
            idMap.set(id, index)
        }
    }

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



export const blockSortSubMenu = (documentItem: DocumentItem, sortCallback: Function) => {

    let menus = [];
    for (const sortMethodObj of SETTING_CONTENT_BLOCK_SORT_METHOD_ELEMENT()) {
        menus.push({
            label: sortMethodObj.text,
            click: () => {
                sortCallback(documentItem, sortMethodObj.value)
            }
        })
    }
    return menus;

    // return [{
    //     label: "类型",
    //     click: () => {
    //         sortCallback(documentItem, "type")
    //     }
    // }, {
    //     label: "按原文内容顺序",
    //     click: () => {
    //         sortCallback(documentItem, "content")
    //     }
    // }, {
    //     label: "相关度升序",
    //     click: () => {
    //         sortCallback(documentItem, "rankAsc")
    //     }
    // }, {
    //     label: "相关度降序",
    //     click: () => {
    //         sortCallback(documentItem, "rankDesc")
    //     }
    // }, {
    //     label: "修改时间升序",
    //     click: () => {
    //         sortCallback(documentItem, "modifiedAsc")
    //     }
    // }, {
    //     label: "修改时间降序",
    //     click: () => {
    //         sortCallback(documentItem, "modifiedDesc")
    //     }
    // }, {
    //     label: "创建时间升序",
    //     click: () => {
    //         sortCallback(documentItem, "createdAsc")
    //     }
    // }, {
    //     label: "创建时间降序",
    //     click: () => {
    //         sortCallback(documentItem, "createdDesc")
    //     }
    // }];
};


export function parseSearchCustomKeyword(input: string): CustomBlockCriteria {
    if (isStrEmpty(input)) {
        return null;
    }
    const condition: CustomBlockCriteria = {
        blockKeyWordConditionArray: [],
        notebook: { include: [], exclude: [] },
        path: { include: [], exclude: [] },
        createdTimeArray: [],
        updatedTimeArray: [],
    };

    // 处理关键字分组
    const updateKeywordGroup = (type: any, value: string, exclude: boolean) => {
        let group = condition.blockKeyWordConditionArray.find(g => g.type === type);
        if (!group) {
            group = { type, include: [], exclude: [] };
            condition.blockKeyWordConditionArray.push(group);
        }

        exclude ? group.exclude.push(value) : group.include.push(value);
    };

    // 解析时间条件
    const parseTime = (value: string, isExclude: boolean): CompareCondition => {

        const operators = new Map([
            ['>=', '>='], ['<=', '<='], ['>', '>'], ['<', '<'], ['=', '='], ['!=', '!='],
            ['eq', '='], ['ne', '!='], ['lt', '<'], ['le', '<='], ['ge', '>='], ['gt', '>'],

        ]);

        const match = value.match(/^(>=|<=|>|<|eq|lt|le|ge|gt|ne|=)?(\d+)$/);

        if (!match) {
            return null;
        }

        // 确保 operator 的值是合法的联合类型
        const matchedOperator = match[1];
        let operator: any = matchedOperator ? operators.get(matchedOperator) : '=';
        let timeValue = match[2];
        console.log(`value ${value} , timeValue ${timeValue} `)

        if (isExclude) return { operator: ' NOT LIKE ', value: `${timeValue}%` };


        if (operator == "=") {
            operator = " LIKE ";
            timeValue = `${timeValue}%`
        } else if (operator == "!=") {
            operator = " NOT LIKE ";
            timeValue = `${timeValue}%`
        } else {
            timeValue = padZeroTo14(timeValue, "end");
        }

        return {
            operator,
            value: timeValue
        };
    };

    // 分割token（简单实现，需要改进引号处理）
    const tokens = splitKeywordStringToArray(input);

    for (let token of tokens) {
        let isExclude = false;
        if (isStrBlank(token)) {
            continue;
        }
        token = token.toLowerCase();

        // 处理排除逻辑
        if (token.startsWith('-')) {
            isExclude = true;
            token = token.slice(1);
        }

        // 解析不同语法 @b 笔记本，@p 路径， @t 块类型，@c 创建时间，@u 更新时间
        if (token.startsWith('@b')) {
            const value = token.slice(2);
            if (isStrEmpty(value)) {
                continue;
            }
            isExclude ? condition.notebook.exclude.push(value) : condition.notebook.include.push(value);
        } else if (token.startsWith('@p')) {
            const value = token.slice(2);
            if (isStrEmpty(value)) {
                continue;
            }
            isExclude ? condition.path.exclude.push(value) : condition.path.include.push(value);
        } else if (token.startsWith('@t')) {
            let value = token.slice(3);
            let type = token.charAt(2);
            const patterns = ['query_embed', 'iframe', 'widget', 'audio', 'video', 'html', 'av', 'tb'];
            const matched = patterns.find((pattern) => token.slice(2).startsWith(pattern));
            if (matched) {
                type = matched;
                value = token.slice(2 + matched.length);
            }
            updateKeywordGroup(type, value, isExclude);
        } else if (token.startsWith('@c')) {
            const value = token.slice(2);
            let compareCondition = parseTime(value, isExclude);
            if (compareCondition) {
                condition.createdTimeArray.push(compareCondition);
            }
        } else if (token.startsWith('@u')) {
            const value = token.slice(2);
            let compareCondition = parseTime(value, isExclude);
            if (compareCondition) {
                condition.updatedTimeArray.push(compareCondition);
            }
        } else {
            // 默认普通关键字
            updateKeywordGroup(undefined, token, isExclude);
        }
    }

    return condition;
}

// export function parseSearchSyntax(query: string): {
//     includeKeywords: string[],
//     excludeKeywords: string[],
// } {
//     const includeKeywords: string[] = [];
//     const excludeKeywords: string[] = [];

//     // 按空格拆分查询字符串
//     const terms = splitKeywordStringToArray(query);

//     for (const term of terms) {
//         if (term.startsWith("-")) {
//             // 以 `-` 开头的排除普通文本
//             excludeKeywords.push(term.slice(1));
//         } else {
//             // 普通文本包含项
//             includeKeywords.push(term);
//         }
//     }

//     return { includeKeywords, excludeKeywords };
// }

/**
 * 将字符串补零至长度14（默认左侧补零）
 * @param value 原始字符串
 * @param direction 补零方向，可选 "start"（左侧）或 "end"（右侧），默认为左侧
 * @returns 长度至少为14的补零后字符串
 */
const padZeroTo14 = (value: string, direction: "start" | "end" = "end"): string => {
    // 根据方向选择补零方法
    return direction === "start"
        ? value.padStart(14, '0')
        : value.padEnd(14, '0');
};



export const filterNotebookIds = (keywords: string[]) => {
    let notebookMap = EnvConfig.ins.notebookMap;

    if (!isArrayNotEmpty(keywords)) return [];

    const ids = [...new Set(
        Array.from(notebookMap.values()).flatMap(notebook =>
            keywords.some(keyword => notebook.name.toLowerCase().includes(keyword.toLowerCase())) ? [notebook.id] : []
        )
    )];


    return isArrayNotEmpty(ids) ? ids : [];
};