import { Dialog } from "siyuan";
import SettingOther from "./setting-other.svelte";
import SettingAttr from "./setting-attr.svelte";
import SettingType from "./setting-type.svelte";
import SettingNotebook from "./setting-notebook.svelte";
import SettingHub from "./setting-hub.svelte";
import { EnvConfig } from "@/config/env-config";

export function openSettingsDialog(dialogType: SettingDialogType) {
    let dialogTitle: string;
    switch (dialogType) {
        case "settingNotebook":
            dialogTitle = EnvConfig.ins.i18n.notebookFilter;
            break;
        case "settingType":
            dialogTitle = EnvConfig.ins.i18n.type;
            break;
        case "settingAttr":
            dialogTitle = EnvConfig.ins.i18n.attr;
            break;
        case "settingOther":
            dialogTitle = EnvConfig.ins.i18n.other;
            break;
        case "settingHub":
            dialogTitle = EnvConfig.ins.i18n.settingHub;
            break;
        default:
            return;
    }

    let dialog = new Dialog({
        title: dialogTitle,
        content: `<div id="${dialogType}" class="b3-dialog__content" ></div>`,
        width: EnvConfig.ins.isMobile ? "92vw" : "600px",
        height: "70vh",
        destroyCallback: (options) => {
            console.log("destroyCallback", options);
        },
    });
    let settingSvelteOptions = {
        target: dialog.element.querySelector(`#${dialogType}`),
    };

    switch (dialogType) {
        case "settingNotebook":
            new SettingNotebook(settingSvelteOptions);
            break;
        case "settingType":
            new SettingType(settingSvelteOptions);
            break;
        case "settingAttr":
            new SettingAttr(settingSvelteOptions);
            break;
        case "settingOther":
            new SettingOther(settingSvelteOptions);
            break;
        case "settingHub":
            let dialogElement = settingSvelteOptions.target as HTMLElement;
            dialogElement.classList.remove("b3-dialog__content");
            dialogElement.style.height = "100%";


            new SettingHub(settingSvelteOptions);
            break;
        default:
            return;
    }

}


