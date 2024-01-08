<script lang="ts">
    import { SettingConfig } from "@/libs/setting-config";
    let includeTypes: string[] = SettingConfig.ins.includeTypes;

    let blockTypeElement = [
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

    function checkboxChange(event) {
        const value = event.target.value;
        let tempIncludeTypes = [];
        if (event.target.checked) {
            tempIncludeTypes = [...includeTypes, value];
        } else {
            tempIncludeTypes = includeTypes.filter((type) => type !== value);
        }

        SettingConfig.ins.updateIncludeTypes(tempIncludeTypes);
        includeTypes = SettingConfig.ins.includeTypes;
    }
</script>

<div id="document-search-setting-type">
    {#each blockTypeElement as element}
        <label class="fn__flex b3-label">
            <svg class="ft__on-surface svg fn__flex-center"
                ><use xlink:href={element.icon}></use></svg
            >
            <span class="fn__space"></span>
            <div class="fn__flex-1 fn__flex-center">{element.text}</div>
            <span class="fn__space"></span>
            <input
                class="b3-switch fn__flex-center"
                data-type={element.dataType}
                type="checkbox"
                value={element.value}
                checked={includeTypes.includes(element.value)}
                on:change={checkboxChange}
            />
        </label>
    {/each}
</div>
