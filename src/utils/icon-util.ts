import { isStrBlank } from "./string-util";



export function getNotebookIcon(iconStr: string): string {
    let icon: string = null;
    icon = convertIconInIal(iconStr);

    // 目前用的系统自带多选框，无法渲染 html。。笔记本图标转换成默认。
    if (isStrBlank(icon) || icon.startsWith("<img")) {
        const LOCAL_IMAGES = "local-images";
        let fileIcon = window.siyuan.storage[LOCAL_IMAGES].note;
        icon = convertIconInIal(fileIcon);
    }
    console.log("getNotebookIcon ", icon)
    return icon;
}


export function getDocIconHtmlByIal(ialStr: string): string {
    let icon: string = null;
    if (ialStr) {
        let ial = convertIalStringToObject(ialStr);
        icon = convertIconInIal(ial.icon);
    }
    if (isStrBlank(icon)) {
        const LOCAL_IMAGES = "local-images";
        let fileIcon = window.siyuan.storage[LOCAL_IMAGES].file;
        icon = convertIconInIal(fileIcon);
    }
    if (!icon.startsWith("<")) {
        icon = `<span class="b3-list-item__graphic">${icon}</span>`;
    }
    return icon;
}

export function convertIconInIal(icon: string): string {
    if (isStrBlank(icon)) {
        return null;
    }

    if (icon.includes(".")) {
        // 如果包含 "."，则认为是图片，生成<img>标签
        return `<img class="b3-list-item__graphic" src="/emojis/${icon}">`;
    } else if (icon.startsWith("api/icon/")) {
        return `<img class="b3-list-item__graphic" src="${icon}">`;
    } else {
        // 如果是Emoji，转换为表情符号
        let emoji = "";
        try {
            icon.split("-").forEach(item => {
                if (item.length < 5) {
                    emoji += String.fromCodePoint(parseInt("0" + item, 16));
                } else {
                    emoji += String.fromCodePoint(parseInt(item, 16));
                }
            });

        } catch (e) {
            // 自定义表情搜索报错 https://github.com/siyuan-note/siyuan/issues/5883
            // 这里忽略错误不做处理
        }
        return emoji;
    }
}

export function convertIalStringToObject(ialStr: string): { [key: string]: string } {
    const obj: { [key: string]: string } = {};

    // 去掉开头和结尾的大括号
    const trimmedInput = ialStr.slice(2, -1);

    // 使用正则表达式解析键值对
    const regex = /(\w+)="([^"]*)"/g;
    let match;

    while ((match = regex.exec(trimmedInput)) !== null) {
        const key = match[1];
        const value = match[2];
        obj[key] = value;
    }

    return obj;
}



export function getBlockTypeIconHref(type: string, subType: string): string {
    let iconHref = "";
    if (type) {
        if (type === "d") {
            iconHref = "#iconFile";
        } else if (type === "h") {
            if (subType === "h1") {
                iconHref = "#iconH1";
            } else if (subType === "h2") {
                iconHref = "#iconH2";
            } else if (subType === "h3") {
                iconHref = "#iconH3";
            } else if (subType === "h4") {
                iconHref = "#iconH4";
            } else if (subType === "h5") {
                iconHref = "#iconH5";
            } else if (subType === "h6") {
                iconHref = "#iconH6";
            }
        } else if (type === "c") {
            iconHref = "#iconCode";
        } else if (type === "html") {
            iconHref = "#iconHTML5";
        } else if (type === "p") {
            iconHref = "#iconParagraph";
        } else if (type === "m") {
            iconHref = "#iconMath";
        } else if (type === "t") {
            iconHref = "#iconTable";
        } else if (type === "b") {
            iconHref = "#iconQuote";
        } else if (type === "l") {
            if (subType === "o") {
                iconHref = "#iconOrderedList";
            } else if (subType === "u") {
                iconHref = "#iconList";
            } else if (subType === "t") {
                iconHref = "#iconCheck";
            }
        } else if (type === "i") {
            iconHref = "#iconListItem";
        } else if (type === "av") {
            iconHref = "#iconDatabase";
        } else if (type === "s") {
            iconHref = "#iconSuper";
        } else if (type === "audio") {
            iconHref = "#iconRecord";
        } else if (type === "video") {
            iconHref = "#iconVideo";
        } else if (type === "query_embed") {
            iconHref = "#iconSQL";
        } else if (type === "tb") {
            iconHref = "#iconLine";
        } else if (type === "widget") {
            iconHref = "#iconBoth";
        } else if (type === "iframe") {
            iconHref = "#iconLanguage";
        }
    }
    return iconHref;
}