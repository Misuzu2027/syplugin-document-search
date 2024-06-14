
import Instance from '@/utils/Instance';
import { Plugin } from 'siyuan';


const SettingFile = 'search-setting.json';

export class SettingConfig {
    private defaultSettings = {
        defaultContentFields: ["content", "tag"],
    }
    private settings = {
        pageSize: 10 as number, // 每页的文档数
        includeTypes: ["d", "h", "c", "m", "t", "p", "html", "av", "video", "audio"] as BlockType[], // 查询的类型
        includeAttrFields: ["name", "alias", "memo"] as string[], // 查询的属性字段
        excludeNotebookIds: [] as string[], // 排除的笔记本ID
        maxExpandCount: 100 as number,  // 最大展开数量，查询结果超过这个数量会自动折叠
        alwaysExpandSingleDoc: false as boolean, // 查询结果为单个文档时，始终展开所有结果。
        showChildDocument: true as boolean, // 是否在分组下面显示文档块，主要是方便复制文档块的id或引用块。
        swapDocItemClickLogic: false as boolean,
        documentSortMethod: "rankDesc" as DocumentSortMethod, // 文档排序方式，默认：相关度降序
        contentBlockSortMethod: "type" as ContentBlockSortMethod, // 内容块排序方式，默认：类型

        doubleClickTimeout: 190 as number, // 双击阈值
        refreshPreviewHighlightTimeout: 240 as number, // 刷新预览区高亮延迟，太短可能会高亮失败，不需要可以设置为0

        docSearchDockPoisition: "LeftTop" as DockPosition,
        flatDocTreeDockPoisition: "LeftTop" as DockPosition,
    };



    public static get ins(): SettingConfig {
        return Instance.get(SettingConfig);
    }

    private plugin: Plugin;

    /**
     * 导入的时候，需要先加载设置；如果没有设置，则使用默认设置
     */
    async load(plugin: Plugin) {
        if (plugin) {
            this.plugin = plugin;
        }
        if (!this.plugin) {
            console.info(`插件为空，无法加载数据。`)
            return;
        }
        let loaded = await this.plugin.loadData(SettingFile);
        if (loaded == null || loaded == undefined || loaded == '') {
            //如果没有配置文件，则使用默认配置，并保存
            console.info(`没有配置文件，使用默认配置`)
            this.save();
        } else {
            //如果有配置文件，则使用配置文件
            console.info(`读入配置文件: ${SettingFile}`)
            //Docker 和  Windows 不知为何行为不一致, 一个读入字符串，一个读入对象
            //为了兼容，这里做一下判断
            if (typeof loaded === 'string') {
                loaded = JSON.parse(loaded);
            }
            try {
                for (let key in loaded) {
                    this.set(key, loaded[key]);
                }
            } catch (error_msg) {
                console.log(`Setting load error: ${error_msg}`);
            }
            this.save();
        }
    }

    async save() {
        if (!this.plugin) {
            return;
        }
        let json = JSON.stringify(this.settings);
        console.log(`写入配置文件: ${json}`);
        this.plugin.saveData(SettingFile, json);
    }

    set(key: any, value: any) {
        if (!(key in this.settings)) {
            console.error(`"${key}" is not a setting`);
            return;
        }
        this.settings[key] = value;
    }

    get pageSize(): number {
        return this.settings.pageSize;
    }

    get includeTypes(): string[] {
        let includeTypes = [...this.settings.includeTypes];
        return includeTypes;
    }

    get includeAttrFields(): string[] {
        return this.settings.includeAttrFields;
    }

    get includeQueryFields(): string[] {
        let queryFields = [...this.defaultSettings.defaultContentFields, ...this.settings.includeAttrFields];
        return queryFields;
    }

    get excludeNotebookIds(): string[] {
        return this.settings.excludeNotebookIds;
    }

    get maxExpandCount(): number {
        return this.settings.maxExpandCount;
    }

    get alwaysExpandSingleDoc(): boolean {
        return this.settings.alwaysExpandSingleDoc;
    }


    get showChildDocument(): boolean {
        return this.settings.showChildDocument;
    }

    get documentSortMethod(): DocumentSortMethod {
        return this.settings.documentSortMethod;
    }

    get contentBlockSortMethod(): ContentBlockSortMethod {
        return this.settings.contentBlockSortMethod;
    }

    get swapDocItemClickLogic(): boolean {
        return this.settings.swapDocItemClickLogic;
    }

    get doubleClickTimeout(): number {
        return this.settings.doubleClickTimeout;
    }

    get refreshPreviewHighlightTimeout(): number {
        return this.settings.refreshPreviewHighlightTimeout;
    }

    get docSearchDockPoisition(): DockPosition {
        return this.settings.docSearchDockPoisition;
    }

    get flatDocTreeDockPoisition(): DockPosition {
        return this.settings.flatDocTreeDockPoisition;
    }

    updatePageSize(pageSize: number) {
        this.settings.pageSize = pageSize;
        this.save();
    }

    updateIncludeTypes(types: BlockType[]) {
        this.settings.includeTypes = types;
        this.save();
    }

    updateIncludeAttrFields(includeAttrFields: string[]) {
        this.settings.includeAttrFields = includeAttrFields;
        this.save();
    }

    updateExcludeNotebookIds(notebookIds: string[]) {
        this.settings.excludeNotebookIds = notebookIds;
        this.save();
    }

    updateMaxExpandCount(maxExpandCount: number) {
        this.settings.maxExpandCount = maxExpandCount;
        this.save();
    }

    updateAlwaysExpandSingleDoc(alwaysExpandSingleDoc: boolean) {
        this.settings.alwaysExpandSingleDoc = alwaysExpandSingleDoc;
        this.save();
    }

    updateShowChildDocument(showChildDocument: boolean) {
        this.settings.showChildDocument = showChildDocument;
        this.save();
    }

    updateDocumentSortMethod(documentSortMethod: DocumentSortMethod) {
        this.settings.documentSortMethod = documentSortMethod;
        this.save();
    }

    updateContentBlockSortMethod(contentBlockSortMethod: ContentBlockSortMethod) {
        this.settings.contentBlockSortMethod = contentBlockSortMethod;
        this.save();
    }

    updateSwapDocItemClickLogic(swapDocItemClickLogic: boolean) {
        this.settings.swapDocItemClickLogic = swapDocItemClickLogic;
        this.save();
    }

    updateDoubleClickTimeout(doubleClickTimeout: number) {
        this.settings.doubleClickTimeout = doubleClickTimeout;
        this.save();
    }

    updateRefreshPreviewHighlightTimeout(refreshPreviewHighlightTimeout: number) {
        this.settings.refreshPreviewHighlightTimeout = refreshPreviewHighlightTimeout;
        this.save();
    }


    updateDocSearchDockPoisition(docSearchDockPoisition: DockPosition) {
        this.settings.docSearchDockPoisition = docSearchDockPoisition;
        this.save();
    }

    updateFlatDocTreeDockPoisition(flatDocTreeDockPoisition: DockPosition) {
        this.settings.flatDocTreeDockPoisition = flatDocTreeDockPoisition;
        this.save();
    }
}