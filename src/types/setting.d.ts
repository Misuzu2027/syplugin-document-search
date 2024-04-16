type SettingDialogType =
    | "settingNotebook"  // 笔记本
    | "settingType" // 类型
    | "settingAttr" // 属性
    | "settingOther" // 其他
    | "settingHub"
    ;

type DocumentSortMethod =
    | "modifiedAsc"
    | "modifiedDesc"
    | "createdAsc"
    | "createdDesc"
    | "rankAsc"
    | "rankDesc"
    | "refCountAsc"
    | "refCountDesc"
    | "alphabeticAsc"
    | "alphabeticDesc"
    ;

type ContentBlockSortMethod =
    | "type"
    | "content"
    | "typeAndContent"
    | DocumentSortMethod
    ;