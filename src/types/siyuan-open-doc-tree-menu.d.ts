/**
 * 当前依赖的 `siyuan` 类型包还没有 `openDocTreeMenu`。
 * 内核从 `require("siyuan")` 导出，见思源 `app/src/plugin/openDocTreeMenu.ts`。
 * 类型包带上同名导出后删掉本文件，避免重复声明。
 */
export {};

declare module "siyuan" {
    export function openDocTreeMenu(options: {
        position?: { x: number; y: number; w?: number; h?: number };
        items: { notebookId: string; id?: string }[];
    }): Promise<boolean>;
}
