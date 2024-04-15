import Instance from "@/utils/Instance";
import { App, I18N, IDockModel, IPluginDockTab, Plugin, getFrontend } from "siyuan";

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

    get i18n(): I18N {
        if (this._plugin) {
            return this._plugin.i18n;
        }
        const i18nObject: I18N = {
            // 添加你需要的属性和方法
        };
        return i18nObject;
    }

    public lastViewedDocId: string;


    public init(plugin: Plugin) {
        let frontEnd: string = getFrontend();
        this._isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this._plugin = plugin;
    }


    docSearchDock: { config: IPluginDockTab, model: IDockModel };
    flatDocTreeDock: { config: IPluginDockTab, model: IDockModel };



}