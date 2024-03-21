
export function convertIconInIal(icon: string): string {
    if (icon) {
        if (icon.includes(".")) {
            // 如果包含 "."，则认为是图片，生成<img>标签
            return `<img class="" src="/emojis/${icon}">`;
        } else {
            // 如果是Emoji，转换为表情符号
            const emoji = String.fromCodePoint(parseInt(icon, 16));
            return emoji;
        }
    }
    // 既不是Emoji也不是图片，返回null
    return null;
}

export function convertIalStringToObject(ial: string): { [key: string]: string } {
    const keyValuePairs = ial.match(/\w+="[^"]*"/g);

    if (!keyValuePairs) {
        return {};
    }

    const resultObject: { [key: string]: string } = {};

    keyValuePairs.forEach((pair) => {
        const [key, value] = pair.split('=');
        resultObject[key] = value.replace(/"/g, ''); // 去除值中的双引号
    });

    return resultObject;
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
        } else if (type === "query_embed") {
            iconHref = "#iconSQL";
        } else if (type === "tb") {
            iconHref = "#iconLine";
        } else if (type === "widget") {
            iconHref = "#iconBoth";
        }
    }
    return iconHref;
}