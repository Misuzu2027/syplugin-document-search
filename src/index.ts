import {
    Plugin,
    openTab,
    getFrontend,
    getBackend,
    Menu,
    ITab,
} from "siyuan";
// import "@/index.scss";

import SearchHomeExample from "@/components/search-home.svelte";
import { CUSTOM_ICON_MAP } from "./libs/icons";


const STORAGE_NAME = "menu-config";
const SEARCH_TAB_TYPE = "search_home_tab";
const SEARCH_DOCK_TYPE = "search_dock_tab";

export default class PluginSample extends Plugin {

    private isMobile: boolean;


    private documentSearchTab: SearchHomeExample;

    async onload() {
        this.data[STORAGE_NAME] = { readonlyText: "Readonly" };

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        // 图标的制作参见帮助文档
        this.addIcons(CUSTOM_ICON_MAP.iconDocumentSearch.source);

        this.addTopBar({
            icon: CUSTOM_ICON_MAP.iconDocumentSearch.id,
            title: this.i18n.documentSearchIconTip,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMobileDocumentSearchMenu();
                } else {
                    this.openDocumentSearchTab();
                }
            }
        });

        let searchHomeExampleDock: SearchHomeExample;
        this.addDock({
            config: {
                position: "LeftTop",
                size: { width: 400, height: 0 },
                icon: CUSTOM_ICON_MAP.iconDocumentSearch.id,
                title: this.i18n.documentSearchIconTip,
                hotkey: "⌥Q",
                show: false,
            },
            data: {},
            type: SEARCH_DOCK_TYPE,
            resize() {
                if (searchHomeExampleDock) {
                    searchHomeExampleDock.resize(this.element.clientWidth);
                }
            },
            update() {
            },
            init() {
                console.log("1");
                searchHomeExampleDock = new SearchHomeExample({
                    target: this.element,
                    props: {
                        app: this.app,
                        showPreview: false,
                    }
                });
            },
            destroy() {
            }
        });


        this.addCommand({
            langKey: "doucmentSearch",
            hotkey: "⇧⌘Q",
            callback: () => {
                this.openDocumentSearchTab();
            },
        });
    }

    onLayoutReady() {
        this.loadData(STORAGE_NAME);

        let searchTabDiv = document.createElement("div");
        let documentSearchTab = new SearchHomeExample({
            target: searchTabDiv,
            props: {
                app: this.app,
                showPreview: true,
            }
        });
        this.documentSearchTab = documentSearchTab;
        this.addTab({
            type: SEARCH_TAB_TYPE,
            init() {
                this.element.appendChild(searchTabDiv);
            },
            beforeDestroy() {
            },
            destroy() {
            },
            resize() {
                if (documentSearchTab) {
                    documentSearchTab.resize();
                }
            },
        });
    }

    async onunload() {

    }

    private openDocumentSearchTab(): ITab {
        let documentSearchTab = this.documentSearchTab;
        return openTab({
            app: this.app,
            custom: {
                id: this.name + SEARCH_TAB_TYPE,
                icon: CUSTOM_ICON_MAP.iconDocumentSearch.id,
                title: `Document Search`,
            },
            afterOpen() {
                if (documentSearchTab) {
                    documentSearchTab.resize();
                }
            }
        });
    }

    private addMobileDocumentSearchMenu() {
        if (!this.isMobile) {
            return;
        }
        let mobileDocSearchClassName = "mobile-document-search"
        const menu = new Menu("mobileDocumentSearchMenu", () => {
            let existingSearchDiv = menu.element.querySelector('.' + mobileDocSearchClassName);
            this.hiddenElement(existingSearchDiv);
            // if (existingSearchDiv) {
            //     existingSearchDiv.remove();
            // }
        });
        const menuElement = menu.element;

        // 检查是否已经存在 Svelte div
        let existingSearchDiv = menuElement.querySelector('.' + mobileDocSearchClassName);
        if (existingSearchDiv) {
            this.showElement(existingSearchDiv);
        } else {
            // 创建搜索组件的容器元素
            let searchContainerDiv = document.createElement('div');
            searchContainerDiv.className = mobileDocSearchClassName;
            // 在 b3-menu__title 后面插入 
            let b3MenuTitle = menuElement.querySelector('.b3-menu__title');
            menuElement.insertBefore(searchContainerDiv, b3MenuTitle.nextSibling);

            new SearchHomeExample({
                target: searchContainerDiv,
                props: {
                    app: this.app,
                    showPreview: false,
                }
            });
        }
        menu.fullscreen();
    }

    private hiddenElement(element: HTMLElement | Element) {
        if (element) {
            let isHidden = element.classList.contains("fn__none");
            if (!isHidden) {
                element.classList.add("fn__none");
            }
        }
    }

    private showElement(element: HTMLElement | Element) {
        if (element) {
            let isHidden = element.classList.contains("fn__none");
            if (isHidden) {
                element.classList.remove("fn__none");
            }
        }
    }

}
