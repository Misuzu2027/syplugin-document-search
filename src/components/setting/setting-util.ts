import { Dialog } from "siyuan";
import SettingOther from "@/components/setting/setting-other.svelte";
import SettingAttr from "@/components/setting/setting-attr.svelte";
import SettingType from "@/components/setting/setting-type.svelte";
import SettingNotebook from "@/components/setting/setting-notebook.svelte";
import SettingHub from "@/components/setting/setting-hub.svelte";
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

    const isHub = dialogType === "settingHub";
    let settingSvelte: { $destroy: () => void } | null = null;

    const dialog = new Dialog({
        title: dialogTitle,
        content: `<div id="${dialogType}" class="b3-dialog__content"></div>`,
        width: EnvConfig.ins.isMobile ? "92vw" : isHub ? "720px" : "600px",
        height: "70vh",
        destroyCallback: () => {
            settingSvelte?.$destroy();
            settingSvelte = null;
        },
    });

    const target = dialog.element.querySelector(
        `#${dialogType}`,
    ) as HTMLElement | null;
    if (!target) return;

    const settingSvelteOptions = { target };

    switch (dialogType) {
        case "settingNotebook":
            settingSvelte = new SettingNotebook(settingSvelteOptions);
            break;
        case "settingType":
            settingSvelte = new SettingType(settingSvelteOptions);
            break;
        case "settingAttr":
            settingSvelte = new SettingAttr(settingSvelteOptions);
            break;
        case "settingOther":
            settingSvelte = new SettingOther(settingSvelteOptions);
            break;
        case "settingHub":
            target.classList.remove("b3-dialog__content");
            target.style.height = "100%";
            settingSvelte = new SettingHub(settingSvelteOptions);
            break;
        default:
            return;
    }
}
