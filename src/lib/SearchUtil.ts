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