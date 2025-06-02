import { DocumentQueryCriteria } from "@/services/search-sql";

export interface CompareCondition {
    operator: string;
    value: string; // YYMMDDhhmmss格式
}

export interface BlockKeywordCondition {
    type?: BlockType;
    subType?: BlockSubType;
    include: string[];
    exclude: string[];
}

export interface BlockCriteria {
    blockKeyWordConditionArray: BlockKeywordCondition[];
    notebook: { include: string[]; exclude: string[] };
    path: { include: string[]; exclude: string[] };
    createdTimeArray: CompareCondition[];
    updatedTimeArray: CompareCondition[];
}

export class DocumentItem {
    block: Block;
    subItems: BlockItem[];
    isCollapsed: boolean;
    icon: string;
    index: number;
    path: string;
    ariaLabel: string;
}

export class BlockItem {
    block: Block;
    icon: string;
    index: number;
}


export class DocumentSqlQueryModel {
    searchCriterion: DocumentQueryCriteria;
    documentItems: DocumentItem[];
    documentCount: number;
    status: "success" | "param_null";
}