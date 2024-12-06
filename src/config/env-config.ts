import { lsNotebooks } from "@/utils/api";
import { convertIconInIal } from "@/utils/icon-util";
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
    public async notebookMap(cache: boolean): Promise<Map<string, Notebook>> {
        if (cache && this._notebookMap && this._notebookMap.size > 0) {
            return this._notebookMap
        } else {
            let notebooks: Notebook[] = (await lsNotebooks()).notebooks;
            this._notebookMap.clear();
            for (const notebook of notebooks) {
                notebook.icon = convertIconInIal(notebook.icon);
                this._notebookMap.set(notebook.id, notebook);
            }
        }
        return this._notebookMap;
    }


}