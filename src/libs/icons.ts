

export const CUSTOM_ICON_MAP =
{
    iconDcoumentSearch: {
        id: "iconDcoumentSearch",
        source: `<symbol id="iconDcoumentSearch" viewBox="0 0 1024 1024">
    <path d="M298.432 902.592c38.784 4.032 88.96 4.096 159.232 4.096h11.648a32 32 0 0 1 0 64h-13.44c-68.032 0-121.6 0-164.096-4.48-43.392-4.48-79.04-13.952-109.568-35.392a208.64 208.64 0 0 1-43.072-40.64c-23.296-29.184-33.536-63.616-38.4-105.088-4.736-40.32-4.736-90.88-4.736-154.688V518.592c0-62.208 0-110.528 2.56-149.504 2.56-39.488 7.936-71.68 19.712-101.248 35.712-90.24 111.04-160.64 205.568-193.92 54.4-19.008 120.128-20.48 229.632-20.608a176.128 176.128 0 0 1 1.6 0h41.792c69.76 0 113.28 0 149.12 12.608 57.536 20.16 103.68 63.168 125.632 118.656 7.488 18.816 10.688 38.784 12.16 62.016 1.536 22.72 1.536 50.688 1.536 85.888V512a32 32 0 0 1-64 0V333.568c0-36.48 0-62.4-1.344-82.752-1.28-20.096-3.84-32.64-7.808-42.688a144.384 144.384 0 0 0-87.424-81.856c-24.192-8.512-55.68-8.96-135.168-8.96H552.32a110.208 110.208 0 0 0-107.968 110.272c0 6.272 0.32 12.992 0.64 20.544l0.128 2.816c0.32 6.656 0.64 13.824 0.832 20.992a192 192 0 0 1-5.12 53.44c-9.536 35.584-37.312 63.36-72.896 72.896a192 192 0 0 1-53.376 5.12c-7.168-0.192-14.4-0.576-20.992-0.832l-2.816-0.128a452.672 452.672 0 0 0-20.608-0.64A110.208 110.208 0 0 0 160 512.832V628.352c0 66.24 0 113.152 4.288 149.248 4.16 35.392 11.968 56.512 24.96 72.768 8.384 10.56 18.432 20.032 29.824 28.096 17.792 12.544 41.088 20.096 79.36 24.128z m-136.128-527.36a173.44 173.44 0 0 1 107.904-37.44c7.936 0 16 0.32 23.552 0.64l2.944 0.192c6.656 0.32 12.928 0.64 19.2 0.704 14.592 0.32 26.24-0.384 35.52-2.88a39.104 39.104 0 0 0 27.712-27.648c2.496-9.344 3.2-20.992 2.88-35.52a737.152 737.152 0 0 0-0.768-19.2l-0.128-2.944a512.64 512.64 0 0 1-0.64-23.552c0-40.32 13.568-77.312 36.48-106.816-29.568 2.432-51.904 6.592-71.936 13.568-77.952 27.392-138.688 84.992-167.296 157.056-8.256 20.864-12.928 45.568-15.36 81.92l-0.064 1.92z"></path>
    <path d="M522.688 743.616a178.304 178.304 0 1 1 324.928 101.376l71.04 71.04a32 32 0 0 1-45.312 45.248l-71.04-71.04a178.304 178.304 0 0 1-279.68-146.688z m178.24-114.304a114.304 114.304 0 1 0 0 228.608 114.304 114.304 0 0 0 0-228.608z"></path>
    </symbol>`
    },
};




export function getIconHerf(type: string, subType: string): string {
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