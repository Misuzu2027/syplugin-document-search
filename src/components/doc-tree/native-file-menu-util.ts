/**
 * 扁平化文档树行复刻了官方文档树的 data-type / data-path / data-name + ul[data-url]，
 * 因此可以把右键交给思源全局 contextmenu（menus/index.ts）弹出完整原生文档菜单。
 *
 * 3.8.1 起 popup() 之后会执行
 * setPanelFocus(hasClosestByClassName(target, "sy__file"))。
 * hasClosestByClassName 找不到时返回 false（不是 null），setPanelFocus(false) 会抛未捕获异常，
 * 菜单无法稳定弹出。这里只在一次右键派发期间借用 sy__file + layout__tab--active，
 * 让 setPanelFocus 命中「已是焦点面板」提前返回。
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
