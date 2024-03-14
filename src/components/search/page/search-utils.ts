import { DocumentItem, BlockItem, DocumentSqlQueryModel } from "@/config/search-model";
import { DocumentQueryCriteria, generateDocumentSearchSql } from "@/services/search-sql";
import { SettingConfig } from "@/services/setting-config";
import { checkBlockFold, getBlockIndex, lsNotebooks, sql } from "@/utils/api";
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
    let searchResults: DocumentItem[] = [];
    if (!blocks) {
        blocks = [];
        return searchResults;
    }
    let keywords = documentSearchCriterion.keywords;
    let documentSortMethod = documentSearchCriterion.documentSortMethod;
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

    let documentSortFun = getDocumentSortFun(documentSortMethod);

    searchResults.sort(documentSortFun);

    let index = 0;
    for (const item of searchResults) {
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
    }
    return searchResults;
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
    if (documentSortMethod == "modifiedAsc") {
        documentSortFun = function (
            a: DocumentItem,
            b: DocumentItem,
        ): number {
            return Number(a.block.updated) - Number(b.block.updated);
        };
    } else if (documentSortMethod == "modifiedDesc") {
        documentSortFun = function (
            a: DocumentItem,
            b: DocumentItem,
        ): number {
            return Number(b.block.updated) - Number(a.block.updated);
        };
    } else if (documentSortMethod == "createdAsc") {
        documentSortFun = function (
            a: DocumentItem,
            b: DocumentItem,
        ): number {
            return Number(a.block.created) - Number(b.block.created);
        };
    } else if (documentSortMethod == "createdDesc") {
        documentSortFun = function (
            a: DocumentItem,
            b: DocumentItem,
        ): number {
            return Number(b.block.created) - Number(a.block.created);
        };
    } else if (documentSortMethod == "rankAsc") {
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
    } else {
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
    }
    return documentSortFun;
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

function highlightMatches(searchString: string, array: string[]): string {
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
    CSS.highlights.clear();

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

    CSS.highlights.set(
        "search-result-focus",
        new Highlight(matchFocusRange),
    );

    callback(matchFocusRange);
}


export async function searchItemSortByContent(subItems: BlockItem[]) {
    let ids = subItems.map(item => item.block.id);
    let idMap: Map<string, number> = await getBatchIdIndex(ids);
    subItems.sort((a, b) => {
        let aIndex = idMap.get(a.block.id) || 0;
        let bIndex = idMap.get(b.block.id) || 0;
        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        } else {
            return a.block.sort - b.block.sort;
        }
    });

    return subItems;
}

async function getBatchIdIndex(ids: string[]) {
    let idMap: Map<string, number> = new Map();
    for (const id of ids) {
        let index = await getBlockIndex(id);
        idMap.set(id, index)
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