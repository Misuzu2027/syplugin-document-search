

export function generateDocumentSearchSql(
    keywords: string[],
    types: string[],
    pages: number[]
): string {
    let concatContentFields: string[] = ["content", "name", "alias", "memo"];
    let concatDocumentConcatFieldSql = getConcatFieldSql(null, concatContentFields);
    let columns = ["root_id", `Max(CASE WHEN parent_id = '' THEN ${concatDocumentConcatFieldSql} END) documentContent`]
    let contentLikeField = `GROUP_CONCAT( ${concatDocumentConcatFieldSql} )`;

    let tempTableOrderCaseCombinationSql = generateOrderCaseCombination("documentContent", keywords) + " ASC ";
    let orders = [tempTableOrderCaseCombinationSql]
    let documentContentLikeSql = generateDocumentContentLikeSql(columns, keywords, contentLikeField, types, orders, pages);

    let concatConcatFieldSql = getConcatFieldSql("concatContent", concatContentFields);
    let typeInSql = generateAndInConditions("type", types);
    let contentParamSql = generateOrLikeConditions("concatContent", keywords);
    let orderCaseCombinationSql = generateOrderCaseCombination("concatContent", keywords);
    let basicSql = `	
        WITH document_id_temp AS (
            ${documentContentLikeSql}
        )
        SELECT *,${concatConcatFieldSql} FROM blocks 
        WHERE
            1 = 1
            ${typeInSql}
            AND (
                id IN (SELECT root_id FROM document_id_temp)
                OR (
                    root_id IN (SELECT root_id FROM document_id_temp)
                    AND (  ${contentParamSql} ) 
                )
            )
        ORDER BY
            sort ASC,
            ${orderCaseCombinationSql},
            updated DESC
        LIMIT 99999999;
    `;
    return cleanSpaceText(basicSql);
    // return basicSql;
}


export function generateDocumentCountSql(
    keywords: string[],
    types: string[],) {

    let concatContentFields: string[] = ["content", "name", "alias", "memo"];
    let concatConcatFieldSql = getConcatFieldSql("documentContent", concatContentFields);

    let columns = ["root_id", concatConcatFieldSql];

    // let orderCaseCombinationSql = generateOrderCaseCombination("documentContent", keywords) + " ASC ";
    // let orders = [orderCaseCombinationSql];
    let contentLikeField = "GROUP_CONCAT( documentContent )";
    let pages = [1, 99999999];
    let documentContentLikeCountSql = generateDocumentContentLikeSql(columns, keywords, contentLikeField, types, null, pages);

    let documentCountSql = `SELECT count(1) AS documentCount FROM (${documentContentLikeCountSql})`;

    return cleanSpaceText(documentCountSql);
}

function generateDocumentContentLikeSql(
    columns: string[],
    keywords: string[],
    contentLikeField: string,
    types: string[],
    orders: string[],
    pages: number[]): string {

    let columnSql = columns.join(",");
    let typeInSql = generateAndInConditions("type", types);
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

    let orderSql = '';
    if (orders) {
        let orderParam = orders.join(",");
        orderSql = ` ORDER BY ${orderParam} `;
    }

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

    let sql = `  
        SELECT ${columnSql} 
        FROM
            blocks 
        WHERE
            1 = 1 
            ${typeInSql}
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
    let sql = ` ( ${fields.join(" || ' '  || ")} ) `
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
    let result = ` AND ${fieldName} in (`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}



function generateOrderCaseCombination(columnName: string, keywords: string[]): string {
    let whenCombinationSql = "";
    for (let index = 0; index < keywords.length; index++) {
        let combination = keywords.length - index;
        whenCombinationSql += generateWhenCombination(columnName, keywords, combination) + index;
    }

    let caseCombinationSql = "";
    if (whenCombinationSql) {
        caseCombinationSql = `
        CASE 
            ${whenCombinationSql}
        ELSE 99
        END
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