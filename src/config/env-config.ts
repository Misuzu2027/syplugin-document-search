import { getNotebookMap, getNotebookMapByApi, } from "@/utils/api";
import Instance from "@/utils/Instance";
import { App, Dock, IObject, IPluginDockTab, Plugin, Tab, getFrontend } from "siyuan";

export class EnvConfig {


    public static get ins(): EnvConfig {
        return Instance.get(EnvConfig);
    }

    private _isMobile: boolean;
    get isMobile(): boolean {
        return this._isMobile;
    }

    private _plugin: Plugin;
    get plugin(): Plugin {
        return this._plugin;
    }

    get app(): App {
        return this._plugin.app;
    }

    get i18n(): IObject {
        if (this._plugin) {
            return this._plugin.i18n;
        }
        const i18nObject: IObject = {
            // 添加你需要的属性和方法
        };
        return i18nObject;
    }

    public lastViewedDocId: string;

    public searchOpenTabPromise: Promise<Tab>;


    public init(plugin: Plugin) {
        let frontEnd: string = getFrontend();
        this._isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this._plugin = plugin;
    }


    docSearchDock: { config: IPluginDockTab, model: Dock };
    flatDocTreeDock: { config: IPluginDockTab, model: Dock };

    private _notebookMap: Map<string, Notebook> = new Map();
    public get notebookMap(): Map<string, Notebook> {
        if (!this._notebookMap || this._notebookMap.size == 0) {
            this.refreshNotebookMap();
            return getNotebookMap(window.siyuan.notebooks);
        }
        return this._notebookMap;
    }

    public async refreshNotebookMap(): Promise<Map<string, Notebook>> {
        this._notebookMap = await getNotebookMapByApi();
        return this._notebookMap;
    }

}