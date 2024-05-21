
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
    if (!keywords.length || !content) {
        return content; // 返回原始字符串，因为没有需要匹配的内容
    }

    const regexPattern = new RegExp(`(${keywords.join("|")})`, "gi");
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