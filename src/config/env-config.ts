import Instance from "@/utils/Instance";
import { App, Plugin, getFrontend } from "siyuan";

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

    public init(plugin: Plugin) {
        let frontEnd: string = getFrontend();
        this._isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this._plugin = plugin;
    }




}