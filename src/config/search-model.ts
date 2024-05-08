import { DocumentQueryCriteria } from "@/services/search-sql";

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