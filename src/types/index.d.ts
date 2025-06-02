/**
 * Copyright (c) 2023 frostime. All rights reserved.
 */

/**
 * Frequently used data structures in SiYuan
 */
type DocumentId = string;
type BlockId = string;
type NotebookId = string;
type PreviousID = BlockId;
type ParentID = BlockId | DocumentId;

type Notebook = {
    id: NotebookId;
    name: string;
    icon: string;
    sort: number;
    closed: boolean;
}

type NotebookConf = {
    name: string;
    closed: boolean;
    refCreateSavePath: string;
    createDocNameTemplate: string;
    dailyNoteSavePath: string;
    dailyNoteTemplatePath: string;
}

// type BlockType = "d" | "s" | "h" | "t" | "i" | "p" | "f" | "audio" | "video" | "other";

type BlockType = "d"  // 文档
    | "h" // 标题
    | "l" // 列表
    | "i" // 列表项
    | "c" // 代码块
    | "m" // 数学公式
    | "t" // 表格
    | "b" // 引述
    | "av" // 属性视图（数据库）
    | "s" // 超级块
    | "p" // 段落
    | "tb" // 表格
    | "html" // HTML
    | "video" // 视频
    | "audio" // 音频
    | "widget" // 挂件
    | "iframe" // iframe
    | "query_embed" // 嵌入块
    ;

type BlockSubType = "o" | "u" | "t" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type Block = {
    id: BlockId;
    parent_id?: BlockId;
    root_id: DocumentId;
    hash: string;
    box: string;
    path: string;
    hpath: string;
    name: string;
    alias: string;
    memo: string;
    tag: string;
    content: string;
    fcontent?: string;
    markdown: string;
    length: number;
    type: BlockType;
    subtype: BlockSubType;
    /** string of { [key: string]: string } 
     * For instance: "{: custom-type=\"query-code\" id=\"20230613234017-zkw3pr0\" updated=\"20230613234509\"}" 
     */
    ial?: string;
    sort: number;
    created: string;
    updated: string;
}

type doOperation = {
    action: string;
    data: string;
    id: BlockId;
    parentID: BlockId | DocumentId;
    previousID: BlockId;
    retData: null;
}

interface Window {
    echarts: {
        init(element: HTMLElement, theme?: string, options?: {
            width: number
        }): {
            setOption(option: any): void;
            getZr(): any;
            on(name: string, event: (e: any) => void): any;
            containPixel(name: string, position: number[]): any;
            resize(): void;
        };
        dispose(element: Element): void;
        getInstanceById(id: string): {
            resize: () => void
            clear: () => void
            getOption: () => { series: { type: string }[] }
        };
    }
    ABCJS: {
        renderAbc(element: Element, text: string, options: {
            responsive: string
        }): void;
    }
    hljs: {
        listLanguages(): string[];
        highlight(text: string, options: {
            language?: string,
            ignoreIllegals: boolean
        }): {
            value: string
        };
        getLanguage(text: string): {
            name: string
        };
    };
    katex: {
        renderToString(math: string, option: {
            displayMode: boolean;
            output: string;
            macros: IObject;
            trust: boolean;
            strict: (errorCode: string) => "ignore" | "warn";
        }): string;
    }
    mermaid: {
        initialize(options: any): void,
        render(id: string, text: string): { svg: string }
    };
    plantumlEncoder: {
        encode(options: string): string,
    };
    pdfjsLib: any

    dataLayer: any[]

    siyuan: ISiyuan
    webkit: {
        messageHandlers: {
            openLink: { postMessage: (url: string) => void }
            startKernelFast: { postMessage: (url: string) => void }
            changeStatusBar: { postMessage: (url: string) => void }
            setClipboard: { postMessage: (url: string) => void }
            purchase: { postMessage: (url: string) => void }
        }
    }
    htmlToImage: {
        toCanvas: (element: Element) => Promise<HTMLCanvasElement>
        toBlob: (element: Element) => Promise<Blob>
    };
    JSAndroid: {
        returnDesktop(): void
        openExternal(url: string): void
        exportByDefault(url: string): void
        changeStatusBarColor(color: string, mode: number): void
        writeClipboard(text: string): void
        writeHTMLClipboard(text: string, html: string): void
        writeImageClipboard(uri: string): void
        readClipboard(): string
        readHTMLClipboard(): string
        getBlockURL(): string
    }
    JSHarmony: {
        openExternal(url: string): void
        exportByDefault(url: string): void
        changeStatusBarColor(color: string, mode: number): void
        writeClipboard(text: string): void
        writeHTMLClipboard(text: string, html: string): void
        readClipboard(): string
        readHTMLClipboard(): string
        returnDesktop(): void
    }

    Protyle: import("../protyle/method").default

    goBack(): void

    showMessage(message: string, timeout: number, type: string, messageId?: string): void

    reconnectWebSocket(): void

    showKeyboardToolbar(height: number): void

    processIOSPurchaseResponse(code: number): void

    hideKeyboardToolbar(): void

    openFileByURL(URL: string): boolean

    destroyTheme(): Promise<void>
}


interface IMenu {
    checked?: boolean,
    iconClass?: string,
    label?: string,
    click?: (element: HTMLElement, event: MouseEvent) => boolean | void | Promise<boolean | void>
    type?: "separator" | "submenu" | "readonly" | "empty",
    accelerator?: string,
    action?: string,
    id?: string,
    submenu?: IMenu[]
    disabled?: boolean
    icon?: string
    iconHTML?: string
    current?: boolean
    bind?: (element: HTMLElement) => void
    index?: number
    element?: HTMLElement
    ignore?: boolean
    warning?: boolean
}


type DockPosition = "Hidden" | "LeftTop" | "LeftBottom" | "RightTop" | "RightBottom" | "BottomLeft" | "BottomRight";