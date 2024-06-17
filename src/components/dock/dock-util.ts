import { CUSTOM_ICON_MAP } from "@/config/icon-constant";
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
        return;
    }
    let docSearchDockPoisition = SettingConfig.ins.docSearchDockPoisition;
    if (!docSearchDockPoisition || docSearchDockPoisition === "Hidden") {
        console.log("不添加搜索 dock")
        return;
    }
    let position: any = docSearchDockPoisition;

    let plugin = EnvConfig.ins.plugin;
    let docSearchSvelet: DocSearchDockSvelte;
    let dockRet = plugin.addDock({
        config: {
            position: position,
            size: { width: 300, height: 0 },
            icon: CUSTOM_ICON_MAP.iconDocumentSearch.id,
            title: EnvConfig.ins.i18n.documentBasedSearchDock,
            hotkey: "⌥Q",
            show: false,
        },
        data: {},
        type: DOC_SEARCH_DOCK_TYPE,
        resize() {
            if (docSearchSvelet) {
                docSearchSvelet.resize(this.element.clientWidth);
            }
        },
        update() {
        },
        init() {
            this.element.innerHTML = "";
            docSearchSvelet = new DocSearchDockSvelte({
                target: this.element,
                props: {
                }
            });
        },
        destroy() {
        }
    });

    EnvConfig.ins.docSearchDock = dockRet;
}

function addFlatDocTreeDock() {
    if (!EnvConfig.ins || !EnvConfig.ins.plugin) {
        console.log("添加扁平文档树 dock 失败。")
        return;
    }
    let flatDocTreeDockPoisition = SettingConfig.ins.flatDocTreeDockPoisition;
    if (!flatDocTreeDockPoisition || flatDocTreeDockPoisition === "Hidden") {
        console.log("不添加扁平化文档树 dock")
        return;
    }
    let position: any = flatDocTreeDockPoisition;

    let plugin = EnvConfig.ins.plugin;
    let flatDocTreeSvelte: FlatDocTreeDockSvelte;
    let dockRet = plugin.addDock({
        config: {
            position: position,
            size: { width: 250, height: 0 },
            icon: CUSTOM_ICON_MAP.iconFlatDocTree.id,
            title: EnvConfig.ins.i18n.flatDocumentTreeDock,
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
            this.element.classList.add("fn__flex-1", "fn__flex-column", "file-tree", "layout__tab--active");
            flatDocTreeSvelte = new FlatDocTreeDockSvelte({
                target: this.element,
                props: {
                }
            });
            if (EnvConfig.ins.isMobile) {
                flatDocTreeSvelte.resize(1);
            }
        },
        destroy() {
        }
    });

    EnvConfig.ins.flatDocTreeDock = dockRet;

}