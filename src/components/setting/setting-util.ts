import { Dialog } from "siyuan";
import SettingOther from "./setting-other.svelte";
import SettingAttr from "./setting-attr.svelte";
import SettingType from "./setting-type.svelte";
import SettingNotebook from "./setting-notebook.svelte";

export function openSettingsDialog(dialogType: SettingDialogType) {
    let dialogTitle: string;
    switch (dialogType) {
        case "settingNotebook":
            dialogTitle = "笔记本过滤";
            break;
        case "settingType":
            dialogTitle = "类型";
            break;
        case "settingAttr":
            dialogTitle = "属性";
            break;
        case "settingOther":
            dialogTitle = "其他设置";
            break;
        default:
            return;
    }

    let dialog = new Dialog({
        title: dialogTitle,
        content: `<div id="${dialogType}" class="b3-dialog__content" ></div>`,
        width: this.isMobile ? "92vw" : "520px",
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
        default:
            return;
    }

}

