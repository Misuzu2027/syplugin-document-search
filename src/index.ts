import {
    Plugin,
    openTab,
} from "siyuan";
// import "@/index.scss";

import SearchPreviewSvelte from "@/components/search/search-preview-view.svelte";
import { CUSTOM_ICON_MAP } from "@/config/icon-constant";
import { SettingConfig } from "@/services/setting-config";
import { EnvConfig } from "@/config/env-config";
import "./index.scss"
import { initDock } from "./components/dock/dock-util";
import { openSettingsDialog } from "./components/setting/setting-util";


const SEARCH_TAB_TYPE = "search_home_tab";


export default class PluginSample extends Plugin {

    private documentSearchTab: SearchPreviewSvelte;

    async onload() {
        EnvConfig.ins.init(this);
        let settingLoadPromise: Promise<void> = SettingConfig.ins.load(this);
        settingLoadPromise.then(this.settingLoadAfter);

        // 图标的制作参见帮助文档
        for (const key in CUSTOM_ICON_MAP) {
            if (Object.prototype.hasOwnProperty.call(CUSTOM_ICON_MAP, key)) {
                const item = CUSTOM_ICON_MAP[key];
                this.addIcons(item.source);
            }
        }
        // this.addIcons(CUSTOM_ICON_MAP.iconDocumentSearch.source);

        if (!EnvConfig.ins.isMobile) {
            this.addTopBar({
                icon: CUSTOM_ICON_MAP.iconDocumentSearch.id,
                title: this.i18n.documentSearchIconTip,
                position: "right",
                callback: () => {
                    this.openDocumentSearchTab();
                }
            });
        }


        //  this.openSetting.bind(this);

        this.addCommand({
            langKey: "打开文档搜索页签",
            hotkey: "⇧⌘Q",
            callback: () => {
                this.openDocumentSearchTab();
            },
        });

    }

    settingLoadAfter(): void {

        initDock();

    }


    openSetting(): void {
        openSettingsDialog("settingHub");
    }

    onLayoutReady() {

        // let searchTabDiv = document.createElement("div");
        // let documentSearchTab = new SearchHomeExample({
        //     target: searchTabDiv,
        //     props: {
        //         app: this.app,
        //         showPreview: true,
        //     }
        // });
        // this.documentSearchTab = documentSearchTab;
        let _this = this;
        this.addTab({
            type: SEARCH_TAB_TYPE,
            init() {
                _this.documentSearchTab = new SearchPreviewSvelte({
                    target: this.element,
                });

                // this.element.replaceChildren(searchTabDiv.childNodes);
            },
            beforeDestroy() {
            },
            destroy() {
            },
            resize() {
                if (_this.documentSearchTab) {
                    _this.documentSearchTab.resize();
                }
            },
        });
    }

    async onunload() {

    }

    private openDocumentSearchTab() {
        let documentSearchTab: SearchPreviewSvelte = this.documentSearchTab;
        openTab({
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

    // private addMobileDocumentSearchMenu() {
    //     console.log("addMobileDocumentSearchMenu");
    //     if (!this.isMobile) {
    //         return;
    //     }

    //     let mobileDocSearchClassName = "mobile-document-search"
    //     const menu = new Menu("mobileDocumentSearchMenu", () => {
    //         let existingSearchDiv = menu.element.querySelector('.' + mobileDocSearchClassName);
    //         this.hiddenElement(existingSearchDiv);
    //         // if (existingSearchDiv) {
    //         //     existingSearchDiv.remove();
    //         // }
    //     });
    //     const menuElement = menu.element;

    //     // 检查是否已经存在 Svelte div
    //     let existingSearchDiv = menuElement.querySelector('.' + mobileDocSearchClassName);
    //     if (existingSearchDiv) {
    //         this.showElement(existingSearchDiv);
    //     } else {
    //         // 创建搜索组件的容器元素
    //         let searchContainerDiv = document.createElement('div');
    //         searchContainerDiv.className = mobileDocSearchClassName;
    //         // 在 b3-menu__title 后面插入 
    //         let b3MenuTitle = menuElement.querySelector('.b3-menu__title');
    //         menuElement.insertBefore(searchContainerDiv, b3MenuTitle.nextSibling);

    //         new SearchHomeExample({
    //             target: searchContainerDiv,
    //             props: {
    //                 app: this.app,
    //                 showPreview: false,
    //             }
    //         });
    //     }
    //     menu.fullscreen();
    // }

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
