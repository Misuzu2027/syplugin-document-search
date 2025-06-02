import { BlockKeywordCondition, CompareCondition } from "@/config/search-model";
import { arrayRemoveValue, arraysEqual, isArrayEmpty, isArrayNotEmpty } from "@/utils/array-util";
import { isStrBlank, isStrEmpty, isStrNotBlank, isStrNotEmpty, isStrNotNull } from "@/utils/string-util";

export class DocumentQueryCriteria {
    includeKeywords: string[];
    excludeKeywords: string[];
    // blockCriteria: BlockCriteria;
    blockKeywordCondition: BlockKeywordCondition[];
    includePathKeywords: string[];
    excludePathKeywords: string[];
    createdTimeArray: CompareCondition[];
    updatedTimeArray: CompareCondition[];
    docFullTextSearch: boolean;
    pages: number[];
    documentSortMethod: DocumentSortMethod;
    contentBlockSortMethod: ContentBlockSortMethod;
    includeTypes: string[];
    includeConcatFields: string[];
    includeRootIds: string[];
    focusBlockId: string;
    includeNotebookIds: string[];
    excludeNotebookIds: string[];

    constructor(
        includeKeywords: string[],
        excludeKeywords: string[],
        blockKeywordCondition: BlockKeywordCondition[],
        includePathKeywords: string[],
        excludePathKeywords: string[],
        createdTimeArray: CompareCondition[],
        updatedTimeArray: CompareCondition[],
        docFullTextSearch: boolean,
        pages: number[],
        documentSortMethod: DocumentSortMethod,
        contentBlockSortMethod: ContentBlockSortMethod,
        includeTypes: string[],
        includeConcatFields: string[],
        includeNotebookIds: string[],
        excludeNotebookIds: string[],
    ) {
        this.includeKeywords = includeKeywords;
        this.excludeKeywords = excludeKeywords;
        this.blockKeywordCondition = blockKeywordCondition;
        this.includePathKeywords = includePathKeywords;
        this.excludePathKeywords = excludePathKeywords;
        this.createdTimeArray = createdTimeArray;
        this.updatedTimeArray = updatedTimeArray;
        this.docFullTextSearch = docFullTextSearch;
        this.pages = pages;
        this.documentSortMethod = documentSortMethod;
        this.contentBlockSortMethod = contentBlockSortMethod;
        this.includeTypes = includeTypes;
        this.includeConcatFields = includeConcatFields;
        this.includeNotebookIds = includeNotebookIds;
        this.excludeNotebookIds = excludeNotebookIds;
    }
}


export function generateDocumentSearchSql(
    queryCriteria: DocumentQueryCriteria,
): string {

    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let blockKeywordCondition = queryCriteria.blockKeywordCondition;
    let pages = queryCriteria.pages;
    let contentBlockSortMethod = queryCriteria.contentBlockSortMethod;
    let includeTypes = queryCriteria.includeTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let docFullTextSearch = queryCriteria.docFullTextSearch;

    let documentIdContentTableSql
        = generateDocumentIdContentTableSql(queryCriteria);
    let documentCountColumnSql = " (SELECT count( 1 ) FROM document_id_temp) as documentCount "
    let documentTableIdPageSql = " SELECT root_id FROM document_id_temp " + generateLimitSql(pages);
    let concatConcatFieldSql = getConcatFieldSql("concatContent", includeConcatFields);
    // 在查询块的时候，无论如何都需要包含文档块类型，否则不知道文档信息
    let includeTypesD: string[] = [...includeTypes, 'd'];

    let blockTypeContentSql = generateBlockTypeAndContentSql(" concatContent ", includeTypes, docFullTextSearch, blockKeywordCondition);
    // console.log("blockTypeContentSql ", blockTypeContentSql)

    let typeInSql = generateAndInConditions("type", includeTypesD);

    let orders = [];
    if (contentBlockSortMethod == 'type') { // type 类型
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", includeKeywords, false);
        orders = [" sort ASC ", orderCaseCombinationSql, " updated DESC "];
    } else if (contentBlockSortMethod == 'modifiedAsc') {
        orders = [" updated ASC "]
    } else if (contentBlockSortMethod == 'modifiedDesc') {
        orders = [" updated DESC "]
    } else if (contentBlockSortMethod == 'createdAsc') {
        orders = [" created ASC "]
    } else if (contentBlockSortMethod == 'createdDesc') {
        orders = [" created DESC "]
    } else if (contentBlockSortMethod == 'rankAsc') {
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", includeKeywords, true);
        orders = [orderCaseCombinationSql, " sort ASC ", " updated DESC "]
    } else if (contentBlockSortMethod == 'rankDesc') {
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", includeKeywords, false);
        orders = [orderCaseCombinationSql, " sort ASC ", " updated DESC "]
    } else if (contentBlockSortMethod == 'alphabeticAsc') {
        orders = ["concatContent ASC", " updated DESC "]
    } else if (contentBlockSortMethod == 'alphabeticDesc') {
        orders = ["concatContent DESC", " updated DESC "]
    }
    let orderSql = generateOrderSql(orders);


    let basicSql = `	
        WITH document_id_temp AS (
            ${documentIdContentTableSql}
        )
        SELECT *, ${concatConcatFieldSql}, ${documentCountColumnSql}
        FROM blocks
        WHERE
            1 = 1
            ${typeInSql}
            AND (
                id IN (${documentTableIdPageSql})
                OR (
                    root_id IN (${documentTableIdPageSql})
                    ${blockTypeContentSql} 
                )
            )
        ${orderSql}
        LIMIT 99999999;
    `;
    return cleanSpaceText(basicSql);
    // return basicSql;
}


export function generateDocumentListSql(
    queryCriteria: DocumentQueryCriteria,
): string {

    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let docFullTextSearch = queryCriteria.docFullTextSearch;
    let pages = queryCriteria.pages;
    let includePathKeyword = queryCriteria.includePathKeywords;
    let excludePathKeyword = queryCriteria.excludePathKeywords;
    let createdTimeArray = queryCriteria.createdTimeArray;
    let updatedTimeArray = queryCriteria.updatedTimeArray;
    let includeNotebookIds = queryCriteria.includeNotebookIds;
    let excludeNotebookIds = queryCriteria.excludeNotebookIds;
    let documentSortMethod = queryCriteria.documentSortMethod;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let columns: string[] = [" * "];

    let contentParamSql = "";
    if (isArrayNotEmpty(includeKeywords) || isArrayNotEmpty(excludeKeywords)) {
        let concatConcatFieldSql = getConcatFieldSql("concatContent", includeConcatFields);
        columns.push(` ${concatConcatFieldSql} `);
        if (docFullTextSearch) {
            let documentIdSql = generateDocumentIdTableSql(queryCriteria);
            contentParamSql = ` AND id in (${documentIdSql}) `;
        } else {
            contentParamSql = generateAndLikeConditions("concatContent", includeKeywords);
            if (isStrNotBlank(contentParamSql)) {
                contentParamSql = " AND " + contentParamSql;
            }
            let contentNotLikeSql = generateAndNotLikeConditions("concatContent", excludeKeywords);
            if (isStrNotBlank(contentNotLikeSql)) {
                contentParamSql += " AND " + contentNotLikeSql;
            }
        }
    }


    let pathLikeSql = " ";
    let pathNotLikeSql = " ";
    let createdTimeWhereSql = " ";
    let updatedTimeWhereSql = " ";
    let boxInSql = " "
    let boxNotInSql = " ";


    if (isArrayNotEmpty(includePathKeyword)) {
        pathLikeSql = ` AND ( ${generateAndLikeConditions("hpath", includePathKeyword)} )`;
    }
    if (isArrayNotEmpty(excludePathKeyword)) {
        pathNotLikeSql = ` AND ( ${generateAndNotLikeConditions("hpath", excludePathKeyword)} )`;
    }

    if (isArrayNotEmpty(createdTimeArray)) {
        createdTimeWhereSql = ` AND ${generateAndNumberConditions("created", createdTimeArray)} `;
    }
    if (isArrayNotEmpty(updatedTimeArray)) {
        updatedTimeWhereSql = ` AND ${generateAndNumberConditions("updated", updatedTimeArray)} `;
    }

    if (isArrayNotEmpty(includeNotebookIds)) {
        boxInSql = generateAndInConditions("box", includeNotebookIds);
    }
    if (isArrayNotEmpty(excludeNotebookIds)) {
        boxNotInSql = generateAndNotInConditions("box", excludeNotebookIds);
    }

    let orders = [];

    if (includeKeywords && includeKeywords.length > 0) {
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", includeKeywords, false);
        orders = [orderCaseCombinationSql];
    }

    if (documentSortMethod == 'modifiedAsc') {
        orders.push([" updated ASC "]);
    } else if (documentSortMethod == 'modifiedDesc') {
        orders.push([" updated DESC "]);
    } else if (documentSortMethod == 'createdAsc') {
        orders.push([" created ASC "]);
    } else if (documentSortMethod == 'createdDesc') {
        orders.push([" created DESC "]);
    } else if (documentSortMethod == 'refCountAsc') {
        columns.push(" (SELECT count(1) FROM refs WHERE def_block_root_id = blocks.id) refCount ");
        orders.push([" refCount ASC ", " updated DESC "]);
    } else if (documentSortMethod == 'refCountDesc') {
        columns.push(" (SELECT count(1) FROM refs WHERE def_block_root_id = blocks.id) refCount ");
        orders.push([" refCount DESC ", " updated DESC "]);
    } else if (documentSortMethod == 'alphabeticAsc') {
        orders.push([" concatContent ASC ", " updated DESC "]);
    } else if (documentSortMethod == 'alphabeticDesc') {
        orders.push([" concatContent DESC ", " updated DESC "]);
    }

    let columnSql = columns.join(" , ");
    let orderSql = generateOrderSql(orders);
    let limitSql = generateLimitSql(pages);
    /*
            * ,
        ${concatConcatFieldSql},
        (SELECT count(1) FROM refs WHERE def_block_root_id = blocks.id) refCount
    */

    let basicSql = `
    SELECT
      ${columnSql}

    FROM
        blocks 
    WHERE
        type = 'd' 
        ${contentParamSql}
        ${boxInSql}
        ${boxNotInSql}
        ${pathLikeSql}
        ${pathNotLikeSql}
        ${createdTimeWhereSql}
        ${updatedTimeWhereSql}

    ${orderSql}
    ${limitSql}
    `

    return cleanSpaceText(basicSql);
}


export function generateCurDocumentSearchSql(
    queryCriteria: DocumentQueryCriteria,
): string {
    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let blockKeywordCondition = queryCriteria.blockKeywordCondition;
    let pages = queryCriteria.pages;
    let contentBlockSortMethod = queryCriteria.contentBlockSortMethod;
    let includeTypes = queryCriteria.includeTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let docFullTextSearch = queryCriteria.docFullTextSearch;
    let includeRootIds = queryCriteria.includeRootIds;
    let focusBlockId = queryCriteria.focusBlockId;

    let foucsBlocksTbSql = ``;
    let tableName = ` blocks `;
    let whereRootIdSql = ` `;
    if (isStrNotBlank(focusBlockId)) {
        foucsBlocksTbSql = `
WITH RECURSIVE focuseBlocksTb AS (
	SELECT *  FROM blocks 
	WHERE id = '${focusBlockId}'
UNION ALL
	SELECT t.* 
	FROM blocks t
		INNER JOIN focuseBlocksTb ON t.parent_id = focuseBlocksTb.id 
) 
`;
        tableName = ` focuseBlocksTb `;
    } else {
        whereRootIdSql = generateAndInConditions("root_id", includeRootIds);;
    }


    let concatConcatFieldSql = getConcatFieldSql("concatContent", includeConcatFields);
    // 在查询块的时候，无论如何都需要包含文档块类型，否则不知道文档信息
    // let includeTypesD: string[] = [...includeTypes, 'd'];

    let blockTypeContentSql = generateBlockTypeAndContentSql(" concatContent ", includeTypes, docFullTextSearch, blockKeywordCondition);
    // console.log("blockTypeContentSql ", blockTypeContentSql)

    // let typeInSql = generateAndInConditions("type", includeTypesD);

    let orders = [];
    if (contentBlockSortMethod == 'type') { // type 类型
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", includeKeywords, false);
        orders = [" sort ASC ", orderCaseCombinationSql, " updated DESC "];
    } else if (contentBlockSortMethod == 'modifiedAsc') {
        orders = [" updated ASC "]
    } else if (contentBlockSortMethod == 'modifiedDesc') {
        orders = [" updated DESC "]
    } else if (contentBlockSortMethod == 'createdAsc') {
        orders = [" created ASC "]
    } else if (contentBlockSortMethod == 'createdDesc') {
        orders = [" created DESC "]
    } else if (contentBlockSortMethod == 'alphabeticAsc') {
        orders = ["concatContent ASC", " updated DESC "]
    } else if (contentBlockSortMethod == 'alphabeticDesc') {
        orders = ["concatContent DESC", " updated DESC "]
    }
    let orderSql = generateOrderSql(orders);


    let basicSql = `	
        ${foucsBlocksTbSql}
SELECT *, ${concatConcatFieldSql}
FROM ${tableName}
WHERE 1 = 1
    ${whereRootIdSql}
    ${blockTypeContentSql} 
LIMIT 99999999;
    `;
    return cleanSpaceText(basicSql);

}

// 暂时不用，把计数很查询合并到一个sql中了
export function generateDocumentCountSql(queryCriteria: DocumentQueryCriteria) {
    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let blockKeywordCondition = queryCriteria.blockKeywordCondition;
    let includePathKeyword = queryCriteria.includePathKeywords;
    let excludePathKeyword = queryCriteria.excludePathKeywords;
    let createdTimeArray = queryCriteria.createdTimeArray;
    let updatedTimeArray = queryCriteria.updatedTimeArray;
    let docFullTextSearch = queryCriteria.docFullTextSearch;
    let includeTypes = queryCriteria.includeTypes;
    let includeRootIds = queryCriteria.includeRootIds;
    let includeNotebookIds = queryCriteria.includeNotebookIds;
    let excludeNotebookIds = queryCriteria.excludeNotebookIds;
    let concatContentFields: string[] = queryCriteria.includeConcatFields;
    let concatConcatFieldSql = getConcatFieldSql("documentContent", concatContentFields);

    let columns = ["root_id", concatConcatFieldSql];

    // let orderCaseCombinationSql = generateOrderCaseCombination("documentContent", keywords) + " ASC ";
    // let orders = [orderCaseCombinationSql];
    let contentLikeField = "documentContent";
    // if (docFullTextSearch) {
    //     contentLikeField = `( ${contentLikeField} )`;
    // }
    let pages = [1, 99999999];
    let documentContentLikeCountSql = generateDocumentContentLikeSql(
        columns, includeKeywords, excludeKeywords,
        blockKeywordCondition,
        docFullTextSearch, contentLikeField, includeTypes, includeRootIds,
        includePathKeyword, excludePathKeyword,
        createdTimeArray, updatedTimeArray,
        includeNotebookIds, excludeNotebookIds, null, pages);

    let documentCountSql = `SELECT count(1) AS documentCount FROM (${documentContentLikeCountSql})`;

    return cleanSpaceText(documentCountSql);
}

function generateDocumentIdContentTableSql(
    queryCriteria: DocumentQueryCriteria
): string {
    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let blockKeywordCondition = queryCriteria.blockKeywordCondition;
    let includePathKeyword = queryCriteria.includePathKeywords;
    let excludePathKeyword = queryCriteria.excludePathKeywords;
    let createdTimeArray = queryCriteria.createdTimeArray;
    let updatedTimeArray = queryCriteria.updatedTimeArray;
    let docFullTextSearch = queryCriteria.docFullTextSearch;
    let pages = queryCriteria.pages;
    let documentSortMethod = queryCriteria.documentSortMethod;
    let includeTypes = queryCriteria.includeTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let includeRootIds = queryCriteria.includeRootIds;
    let includeNotebookIds = queryCriteria.includeNotebookIds;
    let excludeNotebookIds = queryCriteria.excludeNotebookIds;

    let concatDocumentConcatFieldSql = getConcatFieldSql(null, includeConcatFields);
    let contentLikeField = concatDocumentConcatFieldSql;
    let columns = ["root_id"]
    if (docFullTextSearch) {
        columns.push(`Max(CASE WHEN type = 'd' THEN ${concatDocumentConcatFieldSql} END) documentContent`);
    } else {
        columns.push(`(SELECT ( content || tag || alias || memo || name )  FROM blocks WHERE id = b.root_id) documentContent`);
    }

    let orders = [];

    if (documentSortMethod == 'modifiedAsc') {
        orders = [" MAX(updated) ASC "]
    } else if (documentSortMethod == 'modifiedDesc') {
        orders = [" MAX(updated) DESC "]
    } else if (documentSortMethod == 'createdAsc') {
        orders = [" MIN(created) ASC "]
    } else if (documentSortMethod == 'createdDesc') {
        orders = [" MIN(created) DESC "]
    } else if (documentSortMethod == 'rankAsc') {
        let tempTableOrderCaseCombinationSql = generateRelevanceOrderSql("documentContent", includeKeywords, true);
        orders = [tempTableOrderCaseCombinationSql, " MAX(updated) DESC "]
    } else if (documentSortMethod == 'rankDesc') { // rankDesc 相关度降序
        let tempTableOrderCaseCombinationSql = generateRelevanceOrderSql("documentContent", includeKeywords, false);
        orders = [tempTableOrderCaseCombinationSql, " MAX(updated) DESC "]
    } else if (documentSortMethod == 'alphabeticAsc') {
        orders = ["documentContent ASC", " updated DESC "]
    } else if (documentSortMethod == 'alphabeticDesc') {
        orders = ["documentContent DESC", " updated DESC "]
    }

    let documentIdContentTableSql = generateDocumentContentLikeSql(
        columns, includeKeywords, excludeKeywords,
        blockKeywordCondition,
        docFullTextSearch, contentLikeField, includeTypes, includeRootIds,
        includePathKeyword, excludePathKeyword,
        createdTimeArray, updatedTimeArray,
        includeNotebookIds, excludeNotebookIds, orders, null);

    return documentIdContentTableSql;
}

function generateDocumentIdTableSql(
    queryCriteria: DocumentQueryCriteria
): string {
    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let blockKeywordCondition = queryCriteria.blockKeywordCondition;
    let includePathKeyword = queryCriteria.includePathKeywords;
    let excludePathKeyword = queryCriteria.excludePathKeywords;
    let createdTimeArray = queryCriteria.createdTimeArray;
    let updatedTimeArray = queryCriteria.updatedTimeArray;
    let docFullTextSearch = queryCriteria.docFullTextSearch;
    let includeTypes = queryCriteria.includeTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let includeRootIds = queryCriteria.includeRootIds;
    let includeNotebookIds = queryCriteria.includeNotebookIds;
    let excludeNotebookIds = queryCriteria.excludeNotebookIds;

    let concatDocumentConcatFieldSql = getConcatFieldSql(null, includeConcatFields);
    let columns = ["root_id"]
    let contentLikeField = concatDocumentConcatFieldSql;
    // if (docFullTextSearch) {
    //     contentLikeField = `( ${contentLikeField} )`;
    // }


    let orders = [];

    let documentIdContentTableSql = generateDocumentContentLikeSql(
        columns, includeKeywords, excludeKeywords,
        blockKeywordCondition,
        docFullTextSearch, contentLikeField, includeTypes, includeRootIds,
        includePathKeyword, excludePathKeyword,
        createdTimeArray, updatedTimeArray,
        includeNotebookIds, excludeNotebookIds, orders, null);

    return documentIdContentTableSql;
}


function generateDocumentContentLikeSql(
    columns: string[],
    includeKeywords: string[],
    excludeKeywords: string[],
    blockKeyWordConditionArray: BlockKeywordCondition[],
    docFullTextSearch: boolean,
    contentLikeField: string,
    includeTypes: string[],
    includeRootIds: string[],
    includePath: string[],
    excludePath: string[],
    createdTimeArray: CompareCondition[],
    updatedTimeArray: CompareCondition[],
    includeNotebookIds: string[],
    excludeNotebookIds: string[],
    orders: string[],
    pages: number[]): string {

    let columnSql = columns.join(",");
    let typeInSql = generateAndInConditions("type", includeTypes);
    // typeInSql = " ";
    let rootIdInSql = " ";
    let pathLikeSql = " ";
    let pathNotLikeSql = " ";
    let createdTimeWhereSql = " ";
    let updatedTimeWhereSql = " ";
    let boxInSql = " ";
    let boxNotInSql = " ";

    // 如果文档id不为空，则忽略过滤的笔记本id。
    if (isArrayNotEmpty(includeRootIds)) {
        rootIdInSql = generateAndInConditions("root_id", includeRootIds);
    } else {
        if (isArrayNotEmpty(includeNotebookIds)) {
            boxInSql = generateAndInConditions("box", includeNotebookIds);
        }
        if (isArrayNotEmpty(excludeNotebookIds)) {
            boxNotInSql = generateAndNotInConditions("box", excludeNotebookIds);
        }
    }

    if (isArrayNotEmpty(includePath)) {
        pathLikeSql = ` AND ( ${generateAndLikeConditions("hpath", includePath)} )`;
    }
    if (isArrayNotEmpty(excludePath)) {
        pathNotLikeSql = ` AND ( ${generateAndNotLikeConditions("hpath", includePath)} )`;
    }

    if (isArrayNotEmpty(createdTimeArray)) {
        createdTimeWhereSql = ` AND ${generateAndNumberConditions("created", createdTimeArray)} `;
    }

    if (isArrayNotEmpty(updatedTimeArray)) {
        updatedTimeWhereSql = ` AND ${generateAndNumberConditions("updated", updatedTimeArray)} `;
    }
    let blockTypeContentSql = " ";

    if (docFullTextSearch) {
        blockTypeContentSql = generateDocumentTypeAndContentSql(contentLikeField, blockKeyWordConditionArray)
        // let blockTypeContentLikeSqlArray = [];
        // for (const condition of blockKeyWordConditionArray) {
        //     let type = condition.type;
        //     for (const keyword of condition.include) {
        //         blockTypeContentLikeSqlArray.push(generateTypeAndGroupConcatContentLikeSql(type, contentLikeField, keyword, true));
        //     }
        //     for (const keyword of condition.exclude) {
        //         blockTypeContentLikeSqlArray.push(generateTypeAndGroupConcatContentLikeSql(type, contentLikeField, keyword, false));
        //     }
        // }
        // if (isArrayNotEmpty(blockTypeContentLikeSqlArray)) {
        //     blockTypeContentSql = " AND " + blockTypeContentLikeSqlArray.join(' AND ');
        // }
    } else {
        blockTypeContentSql = generateBlockTypeAndContentSql(contentLikeField, includeTypes, false, blockKeyWordConditionArray)
    }

    let orderSql = generateOrderSql(orders);

    let limitSql = generateLimitSql(pages);
    let sql = ``;
    if (docFullTextSearch) {
        sql = `  
        SELECT ${columnSql} 
        FROM
            blocks b
        WHERE
            1 = 1 
            ${typeInSql}
            ${rootIdInSql}
            ${boxInSql}
            ${boxNotInSql}
            ${pathLikeSql}
            ${pathNotLikeSql}
            ${createdTimeWhereSql}
            ${updatedTimeWhereSql}
        GROUP BY
            root_id 
        HAVING
            1 = 1 
            ${blockTypeContentSql}
        ${orderSql}
        ${limitSql}
    `;
    } else {
        sql = `  
        SELECT ${columnSql} 
        FROM
            blocks b
        WHERE
            1 = 1 
            ${typeInSql}
            ${rootIdInSql}
            ${boxInSql}
            ${boxNotInSql}
            ${pathLikeSql}
            ${pathNotLikeSql}
            ${createdTimeWhereSql}
            ${updatedTimeWhereSql}
            ${blockTypeContentSql}
            
        GROUP BY
            root_id 
        ${orderSql}
        ${limitSql}
    `;
    }


    return sql;
}

function getConcatFieldSql(asFieldName: string, fields: string[]): string {
    if (!fields || fields.length <= 0) {
        return "";
    }
    // let sql = ` (${ fields.join(" || ' '  || ") })`;
    let sql = ` (${fields.join(" || ")})`
    if (asFieldName) {
        sql += ` AS ${asFieldName} `;
    }

    return sql;
}

function cleanSpaceText(inputText: string): string {
    // 去除换行
    let cleanedText = inputText.replace(/[\r\n]+/g, ' ');

    // 将多个空格转为一个空格
    cleanedText = cleanedText.replace(/\s+/g, ' ');

    // 去除首尾空格
    cleanedText = cleanedText.trim();

    return cleanedText;
}

function generateOrLikeConditions(
    fieldName: string,
    params: string[],
): string {
    if (isArrayEmpty(params)) {
        return " ";
    }

    const conditions = params.map(
        (param) => `${fieldName} LIKE '%${param}%'`,
    );
    const result = conditions.join(" OR ");

    return result;
}

function generateAndLikeConditions(
    fieldName: string,
    params: string[],
): string {
    if (isArrayEmpty(params)) {
        return " ";
    }

    const conditions = [];
    for (const param of params) {
        if (isStrNotNull(param)) {
            conditions.push(`${fieldName}  LIKE '%${param}%'`)
        }
    }
    const result = conditions.join(" AND ");

    return result;
}


function generateAndNotLikeConditions(
    fieldName: string,
    params: string[],
): string {
    if (isArrayEmpty(params)) {
        return " ";
    }
    const conditions = [];
    for (const param of params) {
        if (isStrNotNull(param)) {
            conditions.push(`${fieldName} NOT LIKE '%${param}%'`);
        }
    }

    const result = conditions.join(" AND ");

    return result;
}




function generateInConditions(
    fieldName: string,
    params: string[],
): string {
    if (isArrayEmpty(params)) {
        return " ";
    }
    let result = ` ${fieldName} IN(`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}

function generateAndInConditions(
    fieldName: string,
    params: string[],
): string {
    if (isArrayEmpty(params)) {
        return " ";
    }

    let result = ` AND ${generateInConditions(fieldName, params)}`

    return result;
}

function generateAndNotInConditions(
    fieldName: string,
    params: string[],
): string {
    if (isArrayEmpty(params)) {
        return " ";
    }
    let result = ` AND ${fieldName} NOT IN(`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}




function generateAndNumberConditions(
    fieldName: string,
    compareCondition: CompareCondition[],
): string {
    if (isArrayEmpty(compareCondition)) {
        return " ";
    }
    const conditions = [];
    for (const condition of compareCondition) {
        conditions.push(`${fieldName} ${condition.operator} '${condition.value}'`);
    }
    const result = conditions.join(" AND ");

    return result;
}



function generateDocumentTypeAndContentSql(
    fieldName: string,
    blockKeyWordConditionArray: BlockKeywordCondition[]
) {
    let blockTypeContentSql = "";
    let blockTypeContentLikeSqlArray = [];
    for (const condition of blockKeyWordConditionArray) {
        let type = condition.type;
        let subType = condition.subType;
        for (const keyword of condition.include) {
            blockTypeContentLikeSqlArray.push(generateTypeAndGroupConcatContentLikeSql(type, subType, fieldName, keyword, true));
        }
        for (const keyword of condition.exclude) {
            blockTypeContentLikeSqlArray.push(generateTypeAndGroupConcatContentLikeSql(type, subType, fieldName, keyword, false));
        }
    }
    if (isArrayNotEmpty(blockTypeContentLikeSqlArray)) {
        blockTypeContentSql = " AND " + blockTypeContentLikeSqlArray.join(' AND ');
    }
    return blockTypeContentSql;
}

function generateTypeAndGroupConcatContentLikeSql(
    type: string | undefined,
    subType: string | undefined,
    field: string,
    // fieldGroupConcat: boolean,
    keyword: string,
    include: boolean
): string {
    // 1. 包含 & 不存在关键字：显示所有类型的块 
    // 2. 包含 & 存在关键字：显示指定类型匹配关键字的块
    // 3. 不包含 & 不存在关键字：排除有这个类型的块和文档。
    // 4. 不包含 & 存在关键字：排除这个类型匹配关键字的块。

    let concatExpr = type
        ? `GROUP_CONCAT(CASE WHEN type = '${type}' THEN ${field} END)`
        : `GROUP_CONCAT(${field})`;
    if (type && subType) {
        concatExpr = `GROUP_CONCAT(CASE WHEN type = '${type}' AND subtype = '${subType}' THEN ${field} END)`
    } else if (type && !subType) {
        concatExpr = `GROUP_CONCAT(CASE WHEN type = '${type}' THEN ${field} END)`;
    } else if (!type) {
        concatExpr = `GROUP_CONCAT(${field})`;
    }
    // if (fieldGroupConcat) {
    // concatExpr = ` GROUP_CONCAT${concatExpr} `
    // }

    const operator = include ? 'LIKE' : 'NOT LIKE';
    let operatorKeyword = `${operator} '%${keyword}%'`;
    if (isStrBlank(keyword)) {
        if (include) {
            operatorKeyword = "IS NOT NULL";
        } else {
            operatorKeyword = "IS NULL";
        }
    }
    return `${concatExpr} ${operatorKeyword}`;

}

function generateBlockTypeAndContentSql(
    fieldName: string,
    includeTypes: string[],
    docFullTextSearch: boolean,
    blockKeyWordConditionArray: BlockKeywordCondition[]
): string {
    let blockKeywordSqlArray = [];
    let includeTypesD: string[] = [...includeTypes, 'd'];
    let orIncludeTypes = [...includeTypes];
    let existInclude = false;
    let existExlucde = false;
    for (const condition of blockKeyWordConditionArray) {
        let likeSql = generateOrLikeConditions(
            ` ${fieldName} `,
            condition.include,
        );
        if (!docFullTextSearch) {
            likeSql = generateAndLikeConditions(
                ` ${fieldName} `,
                condition.include,
            );
        }
        let notLikeSql = generateAndNotLikeConditions(
            ` ${fieldName} `,
            condition.exclude,
        );

        let typeSql = ``;
        let subTypeSql = ``;
        if (isStrNotBlank(condition.type)) {
            typeSql = ` type = '${condition.type}' `;
            orIncludeTypes = arrayRemoveValue(orIncludeTypes, condition.type);
        } else {
            typeSql = generateInConditions("type", includeTypesD);
        }
        if (isStrNotBlank(condition.subType)) {
            subTypeSql = ` subtype = '${condition.subType}' `;
        }
        if (isStrNotBlank(likeSql)) {
            likeSql = ` ( ${likeSql} ) `;
            existInclude = true;
        }
        if (isStrNotBlank(notLikeSql)) {
            // 如果一个类型只存在排除，比如 @tp段子 -@th作品 。
            // 结果应该是只显示 or (type = 'p' and (content like '%段子%')) 的内容，
            // 如果单独加上 or (type = 'h' and content not like '%作品%')  这个判断，会把所有不包含 '作品' 的标题展示出来。
            // 所以如果想要显示上面结果，合理的语法应该是 ：`-@th作品 @tpcv @th`
            if (isStrBlank(likeSql)) {
                continue
            }
            existExlucde = true;
        }

        const conditions = [typeSql, subTypeSql, likeSql, notLikeSql].filter(isStrNotBlank);
        if (isArrayNotEmpty(conditions)) {
            const result = conditions.join(" AND ");
            blockKeywordSqlArray.push(`( ${result} )`)
        }
    }
    let blockTypeContentSql = "";
    if (isArrayNotEmpty(blockKeywordSqlArray)) {
        let extraTypeSql = "";
        // 只存在排除，不存在包含，就加上或则排除之外的类型。
        if (existExlucde && !existInclude && !arraysEqual(orIncludeTypes, includeTypes)) {
            extraTypeSql = ` OR (  ${generateInConditions("type", orIncludeTypes)} )`;
        }
        blockTypeContentSql = `AND ( ${blockKeywordSqlArray.join(" OR ")}  ${extraTypeSql})`;
    }
    return blockTypeContentSql;
}


function generateOrderCaseCombination(columnName: string, keywords: string[], orderAsc: boolean, index?: number, iterationOffset?: number): string {
    let whenCombinationSql = "";
    if (!index) {
        index = 0;
    }
    let endIndex = keywords.length;
    if (iterationOffset != null) {
        endIndex = endIndex - Math.abs(iterationOffset);
    }

    for (; index < endIndex; index++) {
        let combination = keywords.length - index;
        whenCombinationSql += generateWhenCombination(columnName, keywords, combination) + index;
    }

    let caseCombinationSql = "";
    if (whenCombinationSql) {
        let sortDirection = orderAsc ? " ASC " : " DESC ";
        caseCombinationSql = `(
            CASE 
            ${whenCombinationSql}
        ELSE 99
        END) ${sortDirection}
            `;
    }
    return caseCombinationSql;
}

function generateWhenCombination(columnName: string, keywords: string[], combinationCount: number): string {
    if (combinationCount < 1 || combinationCount > keywords.length) {
        return "";
    }
    const combinations: string[][] = [];
    // 生成所有可能的组合
    const generateCombinations = (current: string[], start: number) => {
        if (current.length === combinationCount) {
            combinations.push([...current]);
            return;
        }
        for (let i = start; i < keywords.length; i++) {
            current.push(keywords[i]);
            generateCombinations(current, i + 1);
            current.pop();
        }
    };
    generateCombinations([], 0);
    // 生成查询字符串
    const queryString = combinations
        .map((combination) => {
            const conditions = combination.map((item) => ` ${columnName} LIKE '%${item}%' `).join(" AND ");
            return `(${conditions})`;
        })
        .join(" OR ");

    return ` WHEN ${queryString} THEN`;
}


function generateTypeLikeCombinationConditions(columnName: string, types: string[]): string {
    if (isStrBlank(columnName) || isArrayEmpty(types)) {
        return "";
    }
    const buildCondition = (type: string): string => {
        const conditions = [
            `${columnName} LIKE '%,${type},%'`,   // 包含在中间
            `${columnName} LIKE '%,${type}'`,     // 包含在末尾
            `${columnName} LIKE '${type},%'`,     // 包含在开头
            `${columnName} = '${type}'`           // 单独存在
        ].join(' OR ')
        return `( ${conditions} )`;
    };

    let result = types.map(buildCondition).join(' AND ');
    return result;
}


function generateRelevanceOrderSql(columnName: string, keywords: string[], orderAsc: boolean): string {
    let subSql = "";

    for (let i = 0; i < keywords.length; i++) {
        let key = keywords[i];
        subSql += ` (${columnName} LIKE '%${key}%')`;
        if (i < keywords.length - 1) {
            subSql += ' + ';
        }
    }

    let orderSql = "";
    if (subSql) {
        let sortDirection = orderAsc ? " ASC " : " DESC ";
        orderSql = `(${subSql}) ${sortDirection}`;
    }
    return orderSql;
}


function generateOrderSql(orders: string[]): string {
    let orderSql = '';
    if (orders) {
        orders = orders.filter((order) => order);
        let orderParam = orders.join(",");
        if (orderParam) {
            orderSql = ` ORDER BY ${orderParam} `;
        }
    }
    return orderSql;
}

function generateLimitSql(pages: number[]): string {
    let limitSql = '';
    if (pages) {
        const limit = pages[1];
        if (pages.length == 1) {
            limitSql = ` LIMIT ${limit} `;
        } else if (pages.length == 2) {
            const offset = (pages[0] - 1) * pages[1];
            limitSql = ` LIMIT ${limit} OFFSET ${offset} `;
        }
    }
    return limitSql;
}