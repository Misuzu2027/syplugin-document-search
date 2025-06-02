import { fetchSyncPost } from "siyuan";
import { writeText } from "../util/compatibility";
// import { writeText } from "siyuan/types/protyle/util/compatibility";

export const copyTextByType = async (ids: string[],
    type: "ref" | "blockEmbed" | "protocol" | "protocolMd" | "hPath" | "id") => {
    let text = "";
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (ids.length > 1) {
            text += "* ";
        }
        if (type === "ref") {
            const response = await fetchSyncPost("/api/block/getRefText", { id });
            text += `((${id} '${response.data}'))`;
        } else if (type === "blockEmbed") {
            text += `{{select * from blocks where id='${id}'}}`;
        } else if (type === "protocol") {
            text += `siyuan://blocks/${id}`;
        } else if (type === "protocolMd") {
            const response = await fetchSyncPost("/api/block/getRefText", { id });
            text += `[${response.data}](siyuan://blocks/${id})`;
        } else if (type === "hPath") {
            const response = await fetchSyncPost("/api/filetree/getHPathByID", { id });
            text += response.data;
        } else if (type === "id") {
            text += id;
        }
        if (ids.length > 1 && i !== ids.length - 1) {
            text += "\n";
        }
    }
    writeText(text);
};