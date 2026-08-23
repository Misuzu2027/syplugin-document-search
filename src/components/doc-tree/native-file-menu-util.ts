/**
 * 扁平化文档树行复刻了官方文档树的 data-type / data-path / data-name + ul[data-url][data-sortmode]，
 * 因此可以把右键交给思源全局 contextmenu（menus/index.ts）弹出完整原生文档菜单。
 *
 * 3.8.1 的 initFileMenu 会调用 isCustomFileTreeList → parseSortMode(ul[data-sortmode])。
 * 外层 ul 若只有 data-url，closest 得到 null，parseSortMode(undefined).trim() 会抛错，菜单直接中断。
 *
 * popup() 之后还会执行 setPanelFocus(hasClosestByClassName(target, "sy__file"))。
 * hasClosestByClassName 找不到时返回 false（不是 null），setPanelFocus(false) 会再抛一次。
 * 这里只在一次右键派发期间借用 sy__file + layout__tab--active，让 setPanelFocus 提前返回。
 */

const BORROWED_NATIVE_CLASSES = ["sy__file", "layout__tab--active"];

let releaseBorrowedClasses: (() => void) | null = null;
let releaseListenerBound = false;

function releaseNow(): void {
    const release = releaseBorrowedClasses;
    releaseBorrowedClasses = null;
    release?.();
}

function ensureReleaseListener(): void {
    if (releaseListenerBound) {
        return;
    }
    releaseListenerBound = true;
    window.addEventListener("contextmenu", releaseNow);
}

export function prepareNativeFileTreeMenu(row: HTMLElement): void {
    const host = row.closest("div");
    if (!host) {
        return;
    }
    releaseNow();
    const borrowed = BORROWED_NATIVE_CLASSES.filter(
        (className) => !host.classList.contains(className),
    );
    if (borrowed.length === 0) {
        return;
    }
    host.classList.add(...borrowed);
    releaseBorrowedClasses = () => host.classList.remove(...borrowed);
    ensureReleaseListener();
    window.setTimeout(releaseNow);
}

/** 右键按下时暂时关掉 draggable，避免 Chromium 把右键当成拖拽（拳头光标、菜单被吞）。 */
export function suspendDragForContextMenu(row: HTMLElement): void {
    if (row.getAttribute("draggable") !== "true") {
        return;
    }
    row.setAttribute("draggable", "false");
    const restore = () => {
        row.setAttribute("draggable", "true");
        window.removeEventListener("mouseup", restore);
        window.removeEventListener("contextmenu", restore);
    };
    window.addEventListener("mouseup", restore);
    window.addEventListener("contextmenu", restore);
}

/** 与官方 `Files.ts#genNotebook` 的 `data-sortmode` 对齐，供 initFileMenu 判断是否自定义排序。 */
export function getNotebookSortMode(boxId: string): number {
    const notebooks = window.siyuan?.notebooks as
        | { id: string; sortMode?: number }[]
        | undefined;
    const notebookSortMode = notebooks?.find((item) => item.id === boxId)?.sortMode;
    if (typeof notebookSortMode === "number") {
        return notebookSortMode;
    }
    const globalSort = window.siyuan?.config?.fileTree?.sort;
    return typeof globalSort === "number" ? globalSort : 15;
}
