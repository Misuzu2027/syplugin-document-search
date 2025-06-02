import { copyTextByType } from "../protyle/toolbar/util";

export const copySubMenu = (ids: string[], accelerator = true, focusElement?: Element) => {
    return [{
        id: "copyBlockRef",
        iconHTML: "",
        accelerator: accelerator ? window.siyuan.config.keymap.editor.general.copyBlockRef.custom : undefined,
        label: window.siyuan.languages.copyBlockRef,
        click: () => {
            copyTextByType(ids, "ref");
            // if (focusElement) {
            //     focusBlock(focusElement);
            // }
        }
    }, {
        id: "copyBlockEmbed",
        iconHTML: "",
        label: window.siyuan.languages.copyBlockEmbed,
        accelerator: accelerator ? window.siyuan.config.keymap.editor.general.copyBlockEmbed.custom : undefined,
        click: () => {
            copyTextByType(ids, "blockEmbed");
            // if (focusElement) {
            //     focusBlock(focusElement);
            // }
        }
    }, {
        id: "copyProtocol",
        iconHTML: "",
        label: window.siyuan.languages.copyProtocol,
        accelerator: accelerator ? window.siyuan.config.keymap.editor.general.copyProtocol.custom : undefined,
        click: () => {
            copyTextByType(ids, "protocol");
            // if (focusElement) {
            //     focusBlock(focusElement);
            // }
        }
    }, {
        id: "copyProtocolInMd",
        iconHTML: "",
        label: window.siyuan.languages.copyProtocolInMd,
        accelerator: accelerator ? window.siyuan.config.keymap.editor.general.copyProtocolInMd.custom : undefined,
        click: () => {
            copyTextByType(ids, "protocolMd");
            // if (focusElement) {
            //     focusBlock(focusElement);
            // }
        }
    }, {
        id: "copyHPath",
        iconHTML: "",
        label: window.siyuan.languages.copyHPath,
        accelerator: accelerator ? window.siyuan.config.keymap.editor.general.copyHPath.custom : undefined,
        click: () => {
            copyTextByType(ids, "hPath");
            // if (focusElement) {
            //     focusBlock(focusElement);
            // }
        }
    }, {
        id: "copyID",
        iconHTML: "",
        label: window.siyuan.languages.copyID,
        accelerator: accelerator ? window.siyuan.config.keymap.editor.general.copyID.custom : undefined,
        click: () => {
            copyTextByType(ids, "id");
            // if (focusElement) {
            //     focusBlock(focusElement);
            // }
        }
    }];
};
