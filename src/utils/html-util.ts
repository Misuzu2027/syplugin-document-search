import { findScrollingElement } from "@/components/search/search-util";
import { isStrEmpty, isStrNotEmpty, isStrNotBlank } from "./string-util";
import { isArrayEmpty } from "./array-util";

export const escapeAttr = (html: string) => {
    return html.replace(/"/g, "&quot;").replace(/'/g, "&apos;");
};

export function highlightBlockContent(block: Block, keywords: string[]) {
    if (!block) {
        return;
    }
    let contentHtml = getHighlightedContent(block.content, keywords);
    let nameHml = getHighlightedContent(block.name, keywords);
    let aliasHtml = getHighlightedContent(block.alias, keywords);
    let memoHtml = getHighlightedContent(block.memo, keywords);
    let tagHtml = getHighlightedContent(block.tag, keywords);
    block.content = contentHtml;
    block.name = nameHml;
    block.alias = aliasHtml;
    block.memo = memoHtml;
    block.tag = tagHtml;
}

function getHighlightedContent(
    content: string,
    keywords: string[],
): string {
    if (!content) {
        return content;
    }
    let highlightedContent: string = escapeHtml(content);

    if (keywords) {
        highlightedContent = highlightMatches(highlightedContent, keywords);
    }
    return highlightedContent;
}

function highlightMatches(content: string, keywords: string[]): string {
    if (isArrayEmpty(keywords) || isStrEmpty(content)) {
        return content; // 返回原始字符串，因为没有需要匹配的内容
    }
    keywords = keywords.filter(isStrNotBlank);
    if (isArrayEmpty(keywords)) {
        return content;
    }
    let escapeKeywords = [];
    for (const str of keywords) {
        escapeKeywords.push(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    let escapedKeywordRegExp = escapeKeywords.join("|")
    // console.log("escapedKeywordRegExp ", escapedKeywordRegExp)
    const regexPattern = new RegExp(`(${escapedKeywordRegExp})`, "gi");
    const highlightedString = content.replace(
        regexPattern,
        "<mark>$1</mark>",
    );
    return highlightedString;
}

function escapeHtml(input: string): string {
    const escapeMap: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    return input.replace(/[&<>"']/g, (match) => escapeMap[match]);
}

export function isElementHidden(element: Element) {
    if (!element) {
        return false;
    }

    if (element.classList.contains("fn__none")) {
        return true;
    }

    return isElementHidden(element.parentElement);
}


export function scrollByRange(matchRange: Range, position: ScrollLogicalPosition) {
    if (!matchRange) {
        return;
    }
    position = position ? position : "center";

    const matchElement =
        matchRange.commonAncestorContainer.parentElement;
    if (!matchElement) {
        return;
    }

    if (
        matchElement.clientHeight >
        document.documentElement.clientHeight
    ) {
        // 特殊情况：如果一个段落中软换行非常多，此时如果定位到匹配节点的首行，
        // 是看不到查询的文本的，需要通过 Range 的精确位置进行定位。
        const scrollingElement = findScrollingElement(matchElement);
        const contentRect = scrollingElement.getBoundingClientRect();
        let scrollTop =
            scrollingElement.scrollTop +
            matchRange.getBoundingClientRect().top -
            contentRect.top -
            contentRect.height / 2;
        scrollingElement.scrollTo({
            top: scrollTop,
            behavior: "smooth",
        });
    } else {
        matchElement.scrollIntoView({
            behavior: "smooth",
            block: position,
            inline: position,
        });
    }
}
