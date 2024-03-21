export const SETTING_BLOCK_TYPE_ELEMENT = [
    {
        icon: "#iconMath",
        text: "公式块",
        dataType: "mathBlock",
        value: "m",
    },
    {
        icon: "#iconTable",
        text: "表格",
        dataType: "table",
        value: "t",
    },
    {
        icon: "#iconQuote",
        text: "引述",
        dataType: "blockquote",
        value: "b",
    },
    {
        icon: "#iconSuper",
        text: "超级块",
        dataType: "superBlock",
        value: "s",
    },
    {
        icon: "#iconParagraph",
        text: "段落",
        dataType: "paragraph",
        value: "p",
    },
    {
        icon: "#iconFile",
        text: "文档",
        dataType: "document",
        value: "d",
    },
    {
        icon: "#iconHeadings",
        text: "标题",
        dataType: "heading",
        value: "h",
    },
    {
        icon: "#iconList",
        text: "列表",
        dataType: "checkbox",
        value: "l",
    },
    {
        icon: "#iconListItem",
        text: "列表项",
        dataType: "listItem",
        value: "i",
    },
    {
        icon: "#iconCode",
        text: "代码块",
        dataType: "codeBlock",
        value: "c",
    },
    {
        icon: "#iconHTML5",
        text: "HTML",
        dataType: "htmlBlock",
        value: "html",
    },
    {
        icon: "#iconSQL",
        text: "嵌入块",
        dataType: "embedBlock",
        value: "query_embed",
    },
    {
        icon: "#iconDatabase",
        text: "数据库",
        dataType: "databaseBlock",
        value: "av",
    },
];

export const SETTING_BLOCK_ATTR_ELEMENT = [
    {
        icon: "#iconN",
        text: "命名",
        value: "name",
    },
    {
        icon: "#iconA",
        text: "别名",
        value: "alias",
    },
    {
        icon: "#iconM",
        text: "备注",
        value: "memo",
    },
    {
        icon: "#iconAttr",
        text: "所有属性名和属性值",
        value: "ial",
    },
];



export const SETTING_DOCUMENT_SORT_METHOD_ELEMENT = [
    {
        text: "相关度升序",
        value: "rankAsc",
    },
    {
        text: "相关度降序",
        value: "rankDesc",
    },
    {
        text: "修改时间升序",
        value: "modifiedAsc",
    },
    {
        text: "修改时间降序",
        value: "modifiedDesc",
    },
    {
        text: "创建时间升序",
        value: "createdAsc",
    },
    {
        text: "创建时间降序",
        value: "createdDesc",
    },
];

export const SETTING_CONTENT_BLOCK_SORT_METHOD_ELEMENT = [
    {
        text: "类型",
        value: "type",
    },
    {
        text: "按原文内容顺序",
        value: "content",
    },
    ...SETTING_DOCUMENT_SORT_METHOD_ELEMENT,
];

// "LeftTop" | "LeftBottom" | "RightTop" | "RightBottom" | "BottomLeft" | "BottomRight"
export const SETTING_DOC_POISITION_ELEMENT = [
    {
        text: "不显示",
        value: "Hidden",
    },
    {
        text: "左侧上方",
        value: "LeftTop",
    },
    {
        text: "左侧下方",
        value: "LeftBottom",
    },
    {
        text: "右侧上方",
        value: "RightTop",
    },
    {
        text: "右侧下方",
        value: "RightBottom",
    }, {
        text: "下侧左方",
        value: "BottomLeft",
    },
    {
        text: "下侧右方",
        value: "BottomRight",
    },
];



export const SETTING_FLAT_DOCUMENT_TREE_SORT_METHOD_ELEMENT = [
    {
        text: "修改时间升序",
        value: "modifiedAsc",
    },
    {
        text: "修改时间降序",
        value: "modifiedDesc",
    },
    {
        text: "创建时间升序",
        value: "createdAsc",
    },
    {
        text: "创建时间降序",
        value: "createdDesc",
    },
    {
        text: "引用次数升序",
        value: "refCountAsc",
    },
    {
        text: "引用次数降序",
        value: "refCountDesc",
    },
];