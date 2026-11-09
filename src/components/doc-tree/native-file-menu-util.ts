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
