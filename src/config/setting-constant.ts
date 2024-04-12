import { EnvConfig } from "./env-config";

export function SETTING_BLOCK_TYPE_ELEMENT() {
    return [
        {
            icon: "#iconMath",
            text: EnvConfig.ins.i18n.mathBlock,
            dataType: "mathBlock",
            value: "m",
        },
        {
            icon: "#iconTable",
            text: EnvConfig.ins.i18n.table,
            dataType: "table",
            value: "t",
        },
        {
            icon: "#iconQuote",
            text: EnvConfig.ins.i18n.quoteBlock,
            dataType: "quoteBlock",
            value: "b",
        },
        {
            icon: "#iconSuper",
            text: EnvConfig.ins.i18n.superBlock,
            dataType: "superBlock",
            value: "s",
        },
        {
            icon: "#iconParagraph",
            text: EnvConfig.ins.i18n.paragraph,
            dataType: "paragraph",
            value: "p",
        },
        {
            icon: "#iconFile",
            text: EnvConfig.ins.i18n.doc,
            dataType: "document",
            value: "d",
        },
        {
            icon: "#iconHeadings",
            text: EnvConfig.ins.i18n.headings,
            dataType: "heading",
            value: "h",
        },
        {
            icon: "#iconList",
            text: EnvConfig.ins.i18n.list,
            dataType: "checkbox",
            value: "l",
        },
        {
            icon: "#iconListItem",
            text: EnvConfig.ins.i18n.listItem,
            dataType: "listItem",
            value: "i",
        },
        {
            icon: "#iconCode",
            text: EnvConfig.ins.i18n.codeBlock,
            dataType: "codeBlock",
            value: "c",
        },
        {
            icon: "#iconHTML5",
            text: EnvConfig.ins.i18n.htmlBlock,
            dataType: "htmlBlock",
            value: "html",
        },
        {
            icon: "#iconSQL",
            text: EnvConfig.ins.i18n.embedBlock,
            dataType: "embedBlock",
            value: "query_embed",
        },
        {
            icon: "#iconDatabase",
            text: EnvConfig.ins.i18n.database,
            dataType: "databaseBlock",
            value: "av",
        },
        {
            icon: "#iconVideo",
            text: EnvConfig.ins.i18n.video,
            dataType: "videoBlock",
            value: "video",
        },
        {
            icon: "#iconRecord",
            text: EnvConfig.ins.i18n.audio,
            dataType: "audioBlock",
            value: "audio",
        },
        {
            icon: "#iconLanguage",
            text: EnvConfig.ins.i18n.IFrame,
            dataType: "iFrameBlock",
            value: "iframe",
        },
        {
            icon: "#iconBoth",
            text: EnvConfig.ins.i18n.widget,
            dataType: "widgetBlock",
            value: "widget",
        },
    ];
}

export function SETTING_BLOCK_ATTR_ELEMENT() {
    return [
        {
            icon: "#iconN",
            text: EnvConfig.ins.i18n.name,
            value: "name",
        },
        {
            icon: "#iconA",
            text: EnvConfig.ins.i18n.alias,
            value: "alias",
        },
        {
            icon: "#iconM",
            text: EnvConfig.ins.i18n.memo,
            value: "memo",
        },
        {
            icon: "#iconAttr",
            text: EnvConfig.ins.i18n.allAttrs,
            value: "ial",
        },
    ];
}


export function SETTING_DOCUMENT_SORT_METHOD_ELEMENT() {
    return [
        {
            text: EnvConfig.ins.i18n.sortByRankASC,
            value: "rankAsc",
        },
        {
            text: EnvConfig.ins.i18n.sortByRankDESC,
            value: "rankDesc",
        },
        {
            text: EnvConfig.ins.i18n.modifiedASC,
            value: "modifiedAsc",
        },
        {
            text: EnvConfig.ins.i18n.modifiedDESC,
            value: "modifiedDesc",
        },
        {
            text: EnvConfig.ins.i18n.createdASC,
            value: "createdAsc",
        },
        {
            text: EnvConfig.ins.i18n.createdDESC,
            value: "createdDesc",
        },
    ];
}

export function SETTING_CONTENT_BLOCK_SORT_METHOD_ELEMENT() {
    return [
        {
            text: EnvConfig.ins.i18n.type,
            value: "type",
        },
        {
            text: EnvConfig.ins.i18n.sortByContent,
            value: "content",
        },
        ...SETTING_DOCUMENT_SORT_METHOD_ELEMENT(),
        {
            text: EnvConfig.ins.i18n.sortByTypeAndContent,
            value: "typeAndContent",
        },
    ];
}

// "LeftTop" | "LeftBottom" | "RightTop" | "RightBottom" | "BottomLeft" | "BottomRight"
export function SETTING_DOC_POISITION_ELEMENT() {
    return [
        {
            text: EnvConfig.ins.i18n.show,
            value: "LeftTop",
        },
        {
            text: EnvConfig.ins.i18n.hide,
            value: "Hidden",
        },
        // {
        //     text: "左侧上方",
        //     value: "LeftTop",
        // },
        // {
        //     text: "左侧下方",
        //     value: "LeftBottom",
        // },
        // {
        //     text: "右侧上方",
        //     value: "RightTop",
        // },
        // {
        //     text: "右侧下方",
        //     value: "RightBottom",
        // }, {
        //     text: "下侧左方",
        //     value: "BottomLeft",
        // },
        // {
        //     text: "下侧右方",
        //     value: "BottomRight",
        // },
    ];
}


export function SETTING_FLAT_DOCUMENT_TREE_SORT_METHOD_ELEMENT() {
    return [
        {
            text: EnvConfig.ins.i18n.modifiedASC,
            value: "modifiedAsc",
        },
        {
            text: EnvConfig.ins.i18n.modifiedDESC,
            value: "modifiedDesc",
        },
        {
            text: EnvConfig.ins.i18n.createdASC,
            value: "createdAsc",
        },
        {
            text: EnvConfig.ins.i18n.createdDESC,
            value: "createdDesc",
        },
        {
            text: EnvConfig.ins.i18n.refCountASC,
            value: "refCountAsc",
        },
        {
            text: EnvConfig.ins.i18n.refCountDESC,
            value: "refCountDesc",
        },
    ];
}