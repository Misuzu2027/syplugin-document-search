export class DocumentQueryCriteria {
    keywords: string[];
    pages: number[];
    documentSortMethod: DocumentSortMethod;
    contentBlockSortMethod: ContentBlockSortMethod;
    includeTypes: string[];
    includeConcatFields: string[];
    includeRootIds: string[];
    excludeNotebookIds: string[];

    constructor(
        keywords: string[],
        pages: number[],
        documentSortMethod: DocumentSortMethod,
        contentBlockSortMethod: ContentBlockSortMethod,
        includeTypes: string[],
        includeConcatFields: string[],
        excludeNotebookIds: string[],
    ) {
        this.keywords = keywords;
        this.pages = pages;
        this.documentSortMethod = documentSortMethod;
        this.contentBlockSortMethod = contentBlockSortMethod;
        this.includeTypes = includeTypes;
        this.includeConcatFields = includeConcatFields;
        this.excludeNotebookIds = excludeNotebookIds;
    }
}



export function generateDocumentListSql(
    queryCriteria: DocumentQueryCriteria,
): string {

    let keywords = queryCriteria.keywords;
    let pages = queryCriteria.pages;
    let documentSortMethod = queryCriteria.documentSortMethod;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let columns: string[] = [" * "];

    let contentParamSql = "";
    if (keywords && keywords.length > 0) {
        let concatConcatFieldSql = getConcatFieldSql("concatContent", includeConcatFields);
        contentParamSql = " AND " + generateAndLikeConditions("concatContent", keywords);
        columns.push(` ${concatConcatFieldSql} `);
    }

    let orders = [];
    if (documentSortMethod == 'modifiedAsc') {
        orders = [" updated ASC "]
    } else if (documentSortMethod == 'modifiedDesc') {
        orders = [" updated DESC "]
    } else if (documentSortMethod == 'createdAsc') {
        orders = [" created ASC "]
    } else if (documentSortMethod == 'createdDesc') {
        orders = [" created DESC "]
    } else if (documentSortMethod == 'refCountAsc') {
        columns.push(" (SELECT count(1) FROM refs WHERE def_block_root_id = blocks.id) refCount ");
        orders = [" refCount ASC ", " updated DESC "]
    } else if (documentSortMethod == 'refCountDesc') {
        columns.push(" (SELECT count(1) FROM refs WHERE def_block_root_id = blocks.id) refCount ");
        orders = [" refCount DESC ", " updated DESC "]
    } else if (documentSortMethod == 'alphabeticAsc') {
        orders = ["concatContent ASC", " updated DESC "]
    } else if (documentSortMethod == 'alphabeticDesc') {
        orders = ["concatContent DESC", " updated DESC "]
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

    ${orderSql}
    ${limitSql}
    `

    return cleanSpaceText(basicSql);
}


export function generateDocumentSearchSql(
    queryCriteria: DocumentQueryCriteria,
): string {

    let keywords = queryCriteria.keywords;
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
    let typeInSql = generateAndInConditions("type", includeTypesD);
    let contentParamSql = generateOrLikeConditions("concatContent", keywords);

    let orders = [];
    if (contentBlockSortMethod == 'type') { // type 类型
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", keywords, false);
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
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", keywords, true);
        orders = [orderCaseCombinationSql, " sort ASC ", " updated DESC "]
    } else if (contentBlockSortMethod == 'rankDesc') {
        let orderCaseCombinationSql = generateRelevanceOrderSql("concatContent", keywords, false);
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
                    AND (  ${contentParamSql} ) 
                )
            )
        ${orderSql}
        LIMIT 99999999;
    `;
    return cleanSpaceText(basicSql);
    // return basicSql;
}


export function generateDocumentCountSql(queryCriteria: DocumentQueryCriteria) {
    let keywords = queryCriteria.keywords;
    let includeTypes = queryCriteria.includeTypes;
    let includeRootIds = queryCriteria.includeRootIds;
    let excludeNotebookIds = queryCriteria.excludeNotebookIds;

    let concatContentFields: string[] = queryCriteria.includeConcatFields;
    let concatConcatFieldSql = getConcatFieldSql("documentContent", concatContentFields);

    let columns = ["root_id", concatConcatFieldSql];

    // let orderCaseCombinationSql = generateOrderCaseCombination("documentContent", keywords) + " ASC ";
    // let orders = [orderCaseCombinationSql];
    let contentLikeField = "GROUP_CONCAT( documentContent )";
    let pages = [1, 99999999];
    let documentContentLikeCountSql = generateDocumentContentLikeSql(
        columns, keywords, contentLikeField, includeTypes, includeRootIds, excludeNotebookIds, null, pages);

    let documentCountSql = `SELECT count(1) AS documentCount FROM (${documentContentLikeCountSql})`;

    return cleanSpaceText(documentCountSql);
}

function generateDocumentIdContentTableSql(
    queryCriteria: DocumentQueryCriteria
): string {
    let keywords = queryCriteria.keywords;
    let pages = queryCriteria.pages;
    let documentSortMethod = queryCriteria.documentSortMethod;
    let includeTypes = queryCriteria.includeTypes;
    let includeRootIds = queryCriteria.includeRootIds;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let excludeNotebookIds = queryCriteria.excludeNotebookIds;

    let concatDocumentConcatFieldSql = getConcatFieldSql(null, includeConcatFields);
    let columns = ["root_id", `Max(CASE WHEN type = 'd' THEN ${concatDocumentConcatFieldSql} END) documentContent`]
    let contentLikeField = `GROUP_CONCAT( ${concatDocumentConcatFieldSql} )`;

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
        let tempTableOrderCaseCombinationSql = generateRelevanceOrderSql("documentContent", keywords, true);
        orders = [tempTableOrderCaseCombinationSql, " MAX(updated) DESC "]
    } else if (documentSortMethod == 'rankDesc') { // rankDesc 相关度降序
        let tempTableOrderCaseCombinationSql = generateRelevanceOrderSql("documentContent", keywords, false);
        orders = [tempTableOrderCaseCombinationSql, " MAX(updated) DESC "]
    } else if (documentSortMethod == 'alphabeticAsc') {
        orders = ["documentContent ASC", " updated DESC "]
    } else if (documentSortMethod == 'alphabeticDesc') {
        orders = ["documentContent DESC", " updated DESC "]
    }

    let documentIdContentTableSql = generateDocumentContentLikeSql(
        columns, keywords, contentLikeField, includeTypes, includeRootIds, excludeNotebookIds, orders, null);

    return documentIdContentTableSql;
}

function generateDocumentContentLikeSql(
    columns: string[],
    keywords: string[],
    contentLikeField: string,
    includeTypes: string[],
    includeRootIds: string[],
    excludeNotebookIds: string[],
    orders: string[],
    pages: number[]): string {

    let columnSql = columns.join(",");
    let typeInSql = generateAndInConditions("type", includeTypes);
    let rootIdInSql = " ";
    let boxNotInSql = " ";
    // 如果文档id不为空，则忽略过滤的笔记本id。
    if (includeRootIds && includeRootIds.length > 0) {
        rootIdInSql = generateAndInConditions("root_id", includeRootIds);
    } else {
        boxNotInSql = generateAndNotInConditions("box", excludeNotebookIds);
    }

    // let contentOrLikeSql = generateOrLikeConditions("content", keywords);
    // if (contentOrLikeSql) {
    //     contentOrLikeSql = ` AND ( ${contentOrLikeSql} ) `;
    // }
    let aggregatedContentAndLikeSql = generateAndLikeConditions(
        ` ${contentLikeField} `,
        keywords,
    );
    if (aggregatedContentAndLikeSql) {
        aggregatedContentAndLikeSql = ` AND ( ${aggregatedContentAndLikeSql} ) `;
    }

    let orderSql = generateOrderSql(orders);

    let limitSql = generateLimitSql(pages);


    let sql = `  
        SELECT ${columnSql} 
        FROM
            blocks 
        WHERE
            1 = 1 
            ${typeInSql}
            ${rootIdInSql}
            ${boxNotInSql}
        GROUP BY
            root_id 
        HAVING
            1 = 1 
            ${aggregatedContentAndLikeSql}
        ${orderSql}
        ${limitSql}
    `;
    return sql;
}

function getConcatFieldSql(asFieldName: string, fields: string[]): string {
    if (!fields || fields.length <= 0) {
        return "";
    }
    // let sql = ` ( ${fields.join(" || ' '  || ")} ) `;
    let sql = ` ( ${fields.join(" || ")} ) `
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
    if (params.length === 0) {
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
    if (params.length === 0) {
        return " ";
    }

    const conditions = params.map(
        (param) => `${fieldName}  LIKE '%${param}%'`,
    );
    const result = conditions.join(" AND ");

    return result;
}

function generateAndInConditions(
    fieldName: string,
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` AND ${fieldName} IN (`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}

function generateAndNotInConditions(
    fieldName: string,
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` AND ${fieldName} NOT IN (`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

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
        END ) ${sortDirection}
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

    return ` WHEN ${queryString} THEN `;
}


function generateRelevanceOrderSql(columnName: string, keywords: string[], orderAsc: boolean): string {
    let subSql = "";

    for (let i = 0; i < keywords.length; i++) {
        let key = keywords[i];
        subSql += ` (${columnName} LIKE '%${key}%') `;
        if (i < keywords.length - 1) {
            subSql += ' + ';
        }
    }

    let orderSql = "";
    if (subSql) {
        let sortDirection = orderAsc ? " ASC " : " DESC ";
        orderSql = `( ${subSql} ) ${sortDirection}`;
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