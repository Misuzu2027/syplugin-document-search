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

    onload() {
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
                title: this.i18n.documentBasedSearch,
                position: "right",
                callback: () => {
                    this.openDocumentSearchTab();
                }
            });
        }


        //  this.openSetting.bind(this);

        this.addCommand({
            langKey: EnvConfig.ins.i18n.openDocumentSearchTab,
            hotkey: "⇧⌘Q",
            callback: () => {
                this.openDocumentSearchTab();
            },
        });

        this.eventBus.on('switch-protyle', (e: any) => {
            // console.log("switch-protyle " + JSON.stringify(e.detail.protyle.block));
            EnvConfig.ins.lastViewedDocId = e.detail.protyle.block.rootID;
            // utils.setCurrentBoxId(e.detail.protyle.notebookId)
        })

    }

    settingLoadAfter(): void {
        initDock();
    }


    openSetting(): void {
        openSettingsDialog("settingHub");
    }

    onLayoutReady() {
        let _this = this;
        this.addTab({
            type: SEARCH_TAB_TYPE,
            init() {
                _this.documentSearchTab = new SearchPreviewSvelte({
                    target: this.element,
                });
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

}
