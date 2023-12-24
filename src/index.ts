import {
    Plugin,
    showMessage,
    openTab,
    getFrontend,
    getBackend,
    Menu,
} from "siyuan";
// import "@/index.scss";

import SearchHomeExample from "@/components/search-home.svelte";
import { CUSTOM_ICON_MAP } from "./libs/icons";


const STORAGE_NAME = "menu-config";
const SEARCH_TAB_TYPE = "search_home_tab";
const SEARCH_DOCK_TYPE = "search_dock_tab";

export default class PluginSample extends Plugin {

    private isMobile: boolean;

    async onload() {
        this.data[STORAGE_NAME] = { readonlyText: "Readonly" };

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        console.log("CUSTOM_ICON_MAP.iconDcoumentSearch.source : ", CUSTOM_ICON_MAP.iconDcoumentSearch.source)

        // 图标的制作参见帮助文档
        this.addIcons(CUSTOM_ICON_MAP.iconDcoumentSearch.source);

        this.addTopBar({
            icon: CUSTOM_ICON_MAP.iconDcoumentSearch.id,
            title: this.i18n.documentSearchIconTip,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMobileDocumentSearchMenu();
                } else {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            id: this.name + SEARCH_TAB_TYPE,
                            icon: CUSTOM_ICON_MAP.iconDcoumentSearch.id,
                            title: "Document Search Tab",
                        }
                    });
                    console.log("Open Document Search Tab click : ", tab);
                }
            }
        });

        let searchHomeExampleDock: SearchHomeExample;
        this.addDock({
            config: {
                position: "LeftTop",
                size: { width: 500, height: 0 },
                icon: CUSTOM_ICON_MAP.iconDcoumentSearch.id,
                title: this.i18n.documentSearchIconTip,
                hotkey: "⇧⌘Q"
            },
            data: {
                text: "This is my custom dock"
            },
            type: SEARCH_DOCK_TYPE,
            resize() {
                console.log(SEARCH_DOCK_TYPE + " resize");
                if (searchHomeExampleDock) {
                    searchHomeExampleDock.resize();
                }
            },
            init() {
                searchHomeExampleDock = new SearchHomeExample({
                    target: this.element,
                    props: {
                        app: this.app,
                        showPreview: false,
                    }
                });
            },
            destroy() {
                console.log("destroy dock:", SEARCH_DOCK_TYPE);
            }
        });

        console.log(this.i18n.helloPlugin);
    }

    onLayoutReady() {
        console.log("onLayoutReady start")
        this.loadData(STORAGE_NAME);

        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);

        let searchTabDiv = document.createElement("div");
        let customDcoumentSearchTab: SearchHomeExample = new SearchHomeExample({
            target: searchTabDiv,
            props: {
                app: this.app,
                showPreview: true,
            }
        });

        this.addTab({
            type: SEARCH_TAB_TYPE,
            init() {
                console.log("init tab:", SEARCH_TAB_TYPE);
                this.element.appendChild(searchTabDiv);
                customDcoumentSearchTab.openInit();
            },
            beforeDestroy() {
                console.log("before destroy tab:", SEARCH_TAB_TYPE);
            },
            destroy() {
                console.log("destroy tab:", SEARCH_TAB_TYPE);
            },
            resize() {
                customDcoumentSearchTab.resize();
                console.log("resize tab:", SEARCH_TAB_TYPE);
            },
        });
    }

    async onunload() {
        // console.log(this.i18n.byePlugin);
        // showMessage("Goodbye SiYuan Plugin");

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
