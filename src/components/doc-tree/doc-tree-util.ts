import { EnvConfig } from "@/config/env-config";
import { convertDateTimeInBlock, formatRelativeTimeInBlock } from "@/utils/datetime-util";
import { removePrefixAndSuffix } from "@/utils/string-util";

export function getFileArialLabel(block: any, boxName: string): string {
    let ariaLabelRow: string[] = [];
    // ariaLabelRow.push(block.content);
    if (block.name) {
        ariaLabelRow.push(
            `<br>${window.siyuan.languages.name} ${block.name}`,
        );
    }
    if (block.alias) {
        ariaLabelRow.push(
            `<br>${window.siyuan.languages.alias} ${block.alias}`,
        );
    }
    if (block.memo) {
        ariaLabelRow.push(
            `<br>${window.siyuan.languages.memo} ${block.memo}`,
        );
    }

    ariaLabelRow.push(`<br>${EnvConfig.ins.i18n.notebook} ${boxName}`);
    ariaLabelRow.push(`<br>${EnvConfig.ins.i18n.path} ${block.hpath}`);

    let updated = formatRelativeTimeInBlock(block.updated);
    let created = convertDateTimeInBlock(block.created);

    ariaLabelRow.push(
        `<br>${window.siyuan.languages.modifiedAt} ${updated}`,
    );
    ariaLabelRow.push(
        `<br>${window.siyuan.languages.createdAt} ${created}`,
    );

    let ariaLabel = ariaLabelRow.join("");
    ariaLabel = removePrefixAndSuffix(ariaLabel, "<br>", "<br>");

    return ariaLabel;
}
