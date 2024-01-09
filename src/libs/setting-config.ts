
import Instance from '@/utils/Instance';
import { Plugin } from 'siyuan';


const SettingFile = 'search-setting.json';

export class SettingConfig {
    private defaultSettings = {
        defaultConentFields: ["content", "tag"],
    }
    private settings = {
        pageSize: 10 as number, // 每页的文档数
        includeTypes: ["d", "h", "c", "m", "t", "p", "html", "av"] as BlockType[], // 查询的类型
        includeAttrFields: ["name", "alias", "memo"] as string[], // 查询的属性字段
        excludeNotebookIds: [] as string[], // 排除的笔记本ID
        maxExpandCount: 100 as number,  // 最大展开数量，查询结果超过这个数量会自动折叠
        showChildDocument: true as boolean, // 是否再分组下面显示文档块，主要是方便复制文档块的id或引用块。
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
            console.log(loaded);
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
        return this.settings.includeTypes;
    }

    get includeAttrFields(): string[] {
        return this.settings.includeAttrFields;
    }

    get includeQueryFields(): string[] {
        let queryFields = [...this.defaultSettings.defaultConentFields, ...this.settings.includeAttrFields];
        return queryFields;
    }

    get excludeNotebookIds(): string[] {
        return this.settings.excludeNotebookIds;
    }

    get maxExpandCount(): number {
        return this.settings.maxExpandCount;
    }

    get showChildDocument(): boolean {
        return this.settings.showChildDocument;
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

    updateShowChildDocument(showChildDocument: boolean) {
        this.settings.showChildDocument = showChildDocument;
        this.save();
    }

}