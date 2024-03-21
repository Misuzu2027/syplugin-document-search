import { CUSTOM_ICON_MAP } from "@/utils/icons";
import DocSearchDockSvelte from "@/components/dock/doc-search-dock.svelte";
import FlatDocTreeDockSvelte from "@/components/dock/flat-doc-tree-dock.svelte";
import { EnvConfig } from "@/config/env-config";
import { SettingConfig } from "@/services/setting-config";

const DOC_SEARCH_DOCK_TYPE = "doc_search_dock";
const FLAT_DOC_TREE_DOCK_TYPE = "flat_doc_tree_dock";


export function initDock() {
    addDocSearchDock();
    addFlatDocTreeDock();
}


function addDocSearchDock() {
    if (!EnvConfig.ins || !EnvConfig.ins.plugin) {
        console.log("添加搜索 dock 失败。")
    }
    let docSearchDockPoisition = SettingConfig.ins.docSearchDockPoisition;
    if (!docSearchDockPoisition || docSearchDockPoisition === "Hidden") {
        console.log("不添加搜索 dock")
    }
    let position: any = docSearchDockPoisition;

    let plugin = EnvConfig.ins.plugin;
    let searchPageDock: DocSearchDockSvelte;
    plugin.addDock({
        config: {
            position: position,
            size: { width: 300, height: 0 },
            icon: CUSTOM_ICON_MAP.iconDocumentSearch.id,
            title: plugin.i18n.documentSearchIconTip,
            hotkey: "⌥Q",
            show: false,
        },
        data: {},
        type: DOC_SEARCH_DOCK_TYPE,
        resize() {
            if (searchPageDock) {
                searchPageDock.resize(this.element.clientWidth);
            }
        },
        update() {
        },
        init() {
            this.element.innerHTML = "";
            searchPageDock = new DocSearchDockSvelte({
                target: this.element,
                props: {
                }
            });
        },
        destroy() {
        }
    });
}

function addFlatDocTreeDock() {
    if (!EnvConfig.ins || !EnvConfig.ins.plugin) {
        console.log("添加扁平文档树 dock 失败。")
    }
    let docSearchDockPoisition = SettingConfig.ins.docSearchDockPoisition;
    if (!docSearchDockPoisition || docSearchDockPoisition === "Hidden") {
        console.log("不添加扁平化文档树 dock")
    }
    let position: any = docSearchDockPoisition;

    let plugin = EnvConfig.ins.plugin;
    let flatDocTreeSvelte: FlatDocTreeDockSvelte;
    plugin.addDock({
        config: {
            position: position,
            size: { width: 220, height: 0 },
            icon: CUSTOM_ICON_MAP.iconFlatDocTree.id,
            title: "扁平化文档树",
            hotkey: "⌥E",
        },
        data: {
        },
        type: FLAT_DOC_TREE_DOCK_TYPE,
        resize() {
            if (flatDocTreeSvelte) {
                flatDocTreeSvelte.resize(this.element.clientWidth);
            }
        },
        update() {
            console.log(FLAT_DOC_TREE_DOCK_TYPE + " update");
        },
        init() {
            this.element.innerHTML = "";
            // fn__flex-1 fn__flex-column file-tree sy__file layout__tab--active
            this.element.classList.add("fn__flex-1", "fn__flex-column", "file-tree", "sy__file", "layout__tab--active");
            flatDocTreeSvelte = new FlatDocTreeDockSvelte({
                target: this.element,
                props: {
                }
            });
        },
        destroy() {
        }
    });
}