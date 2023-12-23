import {
    Plugin,
    showMessage,
    openTab,
    getFrontend,
    getBackend,
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

        // 图标的制作参见帮助文档
        this.addIcons(CUSTOM_ICON_MAP.iconDcoumentSearch.source);

        this.addTopBar({
            icon: CUSTOM_ICON_MAP.iconDcoumentSearch.id,
            title: this.i18n.documentSearchIconTip,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    // this.addMenu();
                } else {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: CUSTOM_ICON_MAP.iconDcoumentSearch.id,
                            title: "Document Search Tab",
                            id: this.name + SEARCH_TAB_TYPE
                        },
                    });
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
            data: {},
            type: SEARCH_DOCK_TYPE,
            resize() {
                if (searchHomeExampleDock) {
                    searchHomeExampleDock.resize();
                }
            },
            init() {
                searchHomeExampleDock = new SearchHomeExample({
                    target: this.element,
                    props: {
                        app: this.app,
                        isDock: true,
                    }
                });
            },
            destroy() {
            }
        });

    }

    onLayoutReady() {
        this.loadData(STORAGE_NAME);


        let searchTabDiv = document.createElement("div");
        let customDcoumentSearchTab: SearchHomeExample = new SearchHomeExample({
            target: searchTabDiv,
            props: {
                app: this.app,
                isDock: false,
            }
        });

        this.addTab({
            type: SEARCH_TAB_TYPE,
            init() {
                this.element.appendChild(searchTabDiv);
                customDcoumentSearchTab.openInit();
            },
            beforeDestroy() {
            },
            destroy() {
            },
            resize() {
                customDcoumentSearchTab.resize();
            },
        });
    }

    async onunload() {
        // showMessage("Goodbye SiYuan Plugin");
    }
}
