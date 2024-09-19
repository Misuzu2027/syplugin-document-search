export function getActiveTab(): HTMLDivElement {
    let tab = document.querySelector(
        "div.layout__wnd--active ul.layout-tab-bar>li.item--focus",
    );
    let dataId: string = tab?.getAttribute("data-id");
    if (!dataId) {
        return null;
    }
    const activeTab: HTMLDivElement = document.querySelector(
        `.layout-tab-container.fn__flex-1>div.protyle[data-id="${dataId}"]`,
    ) as HTMLDivElement;
    return activeTab;
}

export function determineOpenTabPosition(
    event: MouseEvent,
): "right" | "bottom" | null {
    if (!event.ctrlKey && event.altKey && !event.shiftKey) {
        return "right";
    }
    if (!event.ctrlKey && !event.altKey && event.shiftKey) {
        return "bottom";
    }
    return null;
}