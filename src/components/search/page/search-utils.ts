import { DocumentSearchResultItem } from "@/config/search-model";
import { DocumentQueryCriteria } from "@/services/search-sql";
import { SettingConfig } from "@/services/setting-config";
import { lsNotebooks } from "@/utils/api";
import { convertIalStringToObject, convertIconInIal } from "@/utils/icons";


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
): Promise<DocumentSearchResultItem[]> {
    let searchResults: DocumentSearchResultItem[] = [];
    if (!blocks) {
        blocks = [];
        return searchResults;
    }
    let keywords = documentSearchCriterion.keywords;
    let documentSortMethod = documentSearchCriterion.documentSortMethod;
    let notebookMap = await getNotebookMap();

    const documentBlockMap: Map<string, DocumentSearchResultItem> =
        new Map();

    for (const block of blocks) {
        if (!block) {
            continue;
        }

        highlightBlockContent(block, keywords);

        let rootId = block.root_id;
        let documentItem = new DocumentSearchResultItem();
        documentItem.block = block;
        documentItem.subItems = [];
        documentItem.isCollapsed = true;

        let curParentItem: DocumentSearchResultItem = null;
        if (documentBlockMap.has(rootId)) {
            curParentItem = documentBlockMap.get(rootId);
        } else {
            curParentItem = new DocumentSearchResultItem();
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
        a: DocumentSearchResultItem,
        b: DocumentSearchResultItem,
    ) => number {
    let documentSortFun: (
        a: DocumentSearchResultItem,
        b: DocumentSearchResultItem,
    ) => number;
    if (documentSortMethod == "modifiedAsc") {
        documentSortFun = function (
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
        ): number {
            return Number(a.block.updated) - Number(b.block.updated);
        };
    } else if (documentSortMethod == "modifiedDesc") {
        documentSortFun = function (
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
        ): number {
            return Number(b.block.updated) - Number(a.block.updated);
        };
    } else if (documentSortMethod == "createdAsc") {
        documentSortFun = function (
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
        ): number {
            return Number(a.block.created) - Number(b.block.created);
        };
    } else if (documentSortMethod == "createdDesc") {
        documentSortFun = function (
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
        ): number {
            return Number(b.block.created) - Number(a.block.created);
        };
    } else if (documentSortMethod == "rankAsc") {
        documentSortFun = function (
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
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
            a: DocumentSearchResultItem,
            b: DocumentSearchResultItem,
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
