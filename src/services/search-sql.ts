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

    let documentIdContentTableSql
        = generateDocumentIdContentTableSql(queryCriteria);
    let documentCountColumnSql = " (SELECT count( 1 ) FROM document_id_temp) as documentCount "
    let documentTableIdPageSql = " SELECT root_id FROM document_id_temp " + generateLimitSql(pages);
    let concatConcatFieldSql = getConcatFieldSql("concatContent", includeConcatFields);
    // 在查询块的时候，无论如何都需要包含文档块类型，否则不知道文档信息
    let includeTypesD: string[] = [...includeTypes, 'd'];

    let blockKeywordSqlArray = [];
    let orIncludeTypes = [...includeTypes];
    let existExlucde = false;
    let existInclude = false;
    // console.log("blockKeywordCondition ", blockKeywordCondition)
    for (const condition of blockKeywordCondition) {
        let likeSql = generateAndLikeConditions(
            ` concatContent `,
            condition.include,
        );
        let notLikeSql = generateAndNotLikeConditions(
            ` concatContent `,
            condition.exclude,
        );

        let typeSql = ``;
        if (isStrNotBlank(condition.type)) {
            typeSql = ` type = '${condition.type}' `;
            orIncludeTypes = arrayRemoveValue(orIncludeTypes, condition.type);
            if (!includeTypesD.includes(condition.type)) {
                includeTypesD.push(condition.type);
            }
        } else {
            typeSql = generateInConditions("type", includeTypesD);
            likeSql = generateOrLikeConditions(
                ` concatContent `,
                condition.include,
            );
        }

        if (isStrNotBlank(likeSql)) {
            likeSql = ` ( ${likeSql} ) `;
            existInclude = true;
        }
        if (isStrNotBlank(notLikeSql)) {
            existExlucde = true;
        }
        const conditions = [typeSql, likeSql, notLikeSql].filter(isStrNotBlank);
        if (isArrayNotEmpty(conditions)) {
            const result = conditions.join(" AND ");
            blockKeywordSqlArray.push(`( ${result} )`)
        }
    }
    let contentOrLikeSql = "";
    if (isArrayNotEmpty(blockKeywordSqlArray)) {
        let extraTypeSql = "";
        // 只存在排除，不存在包含，就加上或则排除之外的类型。
        if (existExlucde && !existInclude && !arraysEqual(orIncludeTypes, includeTypes)) {
            extraTypeSql = ` OR (  ${generateInConditions("type", orIncludeTypes)} )`;
        }
        contentOrLikeSql = `AND ( ${blockKeywordSqlArray.join(" OR ")}  ${extraTypeSql})`;
    }
    console.log("contentOrLikeSql ", contentOrLikeSql)

    let typeInSql = generateAndInConditions("type", includeTypesD);
    typeInSql = " ";

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
                    ${contentOrLikeSql} 
                )
            )
        ${orderSql}
        LIMIT 99999999;
    `;
    return cleanSpaceText(basicSql);
    // return basicSql;
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
    if (docFullTextSearch) {
        contentLikeField = `GROUP_CONCAT( ${contentLikeField} )`;
    }
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
    let columns = ["root_id", `Max(CASE WHEN type = 'd' THEN ${concatDocumentConcatFieldSql} END) documentContent`, "GROUP_CONCAT(type,',') GCType"]
    let contentLikeField = concatDocumentConcatFieldSql;
    if (docFullTextSearch) {
        contentLikeField = `GROUP_CONCAT( ${contentLikeField} )`;
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
    if (docFullTextSearch) {
        contentLikeField = `GROUP_CONCAT( ${contentLikeField} )`;
    }


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
    typeInSql = " ";
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

    let blockContentSqlArray = [];
    let includeKeywordTypes = [];
    let notTypeIncludeKeywords = [];
    let notTypeExcludeKeywords = [];
    let orIncludeTypes = [...includeTypes];
    let existExlucde = false;
    let existInclude = false;
    let contentLikeFieldTemp = contentLikeField.replace("GROUP_CONCAT", "");
    for (const condition of blockKeyWordConditionArray) {
        // 必须存在type才能放入这里，否则聚合查询的时候，因为这里过滤掉了，聚合查询反而会出问题
        let likeSql = null;
        let notLikeSql = null;

        let typeSql = ``;
        if (isStrNotBlank(condition.type)) {
            likeSql = generateAndLikeConditions(
                ` ${contentLikeFieldTemp} `,
                condition.include,
            );
            notLikeSql = generateAndNotLikeConditions(
                ` ${contentLikeFieldTemp} `,
                condition.exclude,
            );

            typeSql = ` type = '${condition.type}' `;
            orIncludeTypes = arrayRemoveValue(orIncludeTypes, condition.type);
        } else {
            // typeSql = generateInConditions("type", includeTypes);
            // likeSql = generateOrLikeConditions(
            //     ` ${contentLikeFieldTemp} `,
            //     condition.include,
            // );
            notTypeIncludeKeywords.push(...condition.include);
            notTypeExcludeKeywords.push(...condition.exclude);
        }
        if (isStrNotBlank(likeSql)) {
            existInclude = true;
            likeSql = ` ( ${likeSql} ) `;
            if (isStrNotBlank(condition.type)) {
                includeKeywordTypes.push(condition.type);
            }
        }
        if (isStrNotBlank(notLikeSql)) {
            existExlucde = true;
        }
        const conditions = [typeSql, likeSql, notLikeSql].filter(isStrNotBlank);
        if (isArrayNotEmpty(conditions)) {
            const result = conditions.join(" AND ");
            blockContentSqlArray.push(`( ${result} )`)
        }
    }
    let contentLikeSql = " ";
    if (isArrayNotEmpty(blockContentSqlArray)) {
        let extraTypeSql = "";
        // 只存在排除，不存在包含，就加上或则排除之外的类型。
        if (existExlucde && !existInclude) {
            extraTypeSql = ` OR (  ${generateInConditions("type", orIncludeTypes)} )`;
        }
        contentLikeSql = `AND ( ${blockContentSqlArray.join(" OR ")}  ${extraTypeSql})`;
    }


    let aggregatedTypeCombinationSql = generateTypeLikeCombinationConditions(
        ` GCType `,
        includeKeywordTypes,
    );
    if (isStrNotBlank(aggregatedTypeCombinationSql)) {
        aggregatedTypeCombinationSql = ` AND ( ${aggregatedTypeCombinationSql} ) `;
    }

    let aggregatedContentAndLikeSql = generateAndLikeConditions(
        ` ${contentLikeField} `,
        notTypeIncludeKeywords,
    );
    if (isStrNotBlank(aggregatedContentAndLikeSql)) {
        aggregatedContentAndLikeSql = ` AND ( ${aggregatedContentAndLikeSql} ) `;
    }

    let aggregatedContentAndNotLikeSql = generateAndNotLikeConditions(
        ` ${contentLikeField} `,
        notTypeExcludeKeywords,
    );
    if (isStrNotBlank(aggregatedContentAndNotLikeSql)) {
        aggregatedContentAndNotLikeSql = ` AND ( ${aggregatedContentAndNotLikeSql} ) `;
    }

    let orderSql = generateOrderSql(orders);

    let limitSql = generateLimitSql(pages);
    let sql = ``;
    if (docFullTextSearch) {
        sql = `  
        SELECT ${columnSql} 
        FROM
            blocks 
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
            ${contentLikeSql}
        GROUP BY
            root_id 
        HAVING
            1 = 1 
            ${aggregatedTypeCombinationSql}
            ${aggregatedContentAndLikeSql}
            ${aggregatedContentAndNotLikeSql}
        ${orderSql}
        ${limitSql}
    `;
    } else {
        sql = `  
        SELECT ${columnSql} 
        FROM
            blocks 
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
            ${contentLikeSql}
            ${aggregatedContentAndLikeSql}
            ${aggregatedContentAndNotLikeSql}
            
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