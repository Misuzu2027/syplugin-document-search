export function generateDocumentSearchSql(
    keywords: string[],
): string {
    let aggregatedContentParamSql = generateAndLikeConditions(
        "aggregated_content",
        keywords,
    );
    let contentParamSql = generateOrLikeConditions("content", keywords);
    let orderCaseCombinationSql = generateOrderCaseCombination(keywords);

    let basicSql = `	
        WITH document_id_temp AS (
            SELECT
                root_id,
                GROUP_CONCAT( content ) AS aggregated_content 
            FROM
                blocks 
            WHERE
                1 = 1 
                AND type IN ( 'd', 'h', 'c', 'm', 't', 'p', 'html' ) 
            GROUP BY
                root_id 
            HAVING
                1 = 1 
                AND ( ${aggregatedContentParamSql}   )  
        )
        SELECT * FROM blocks 
        WHERE
            1 = 1 
            AND type IN ( 'd', 'h', 'c', 'm', 't', 'p', 'html' )  
            AND (
                id IN (SELECT root_id FROM document_id_temp)
                OR (
                    root_id IN (SELECT root_id FROM document_id_temp)
                    AND (  ${contentParamSql} ) 
                )
            )
        ORDER BY
            sort ASC,
            ${orderCaseCombinationSql}
            updated DESC
        LIMIT 99999;
    `;
    return cleanSpaceText(basicSql);
    // return basicSql;
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
    keywords: string[],
): string {
    if (keywords.length === 0) {
        return "";
    }

    const conditions = keywords.map(
        (keyword) => `${fieldName} LIKE '%${keyword}%'`,
    );
    const result = conditions.join(" OR ");

    return result;
}

function generateAndLikeConditions(
    fieldName: string,
    keywords: string[],
): string {
    if (keywords.length === 0) {
        return "";
    }

    const conditions = keywords.map(
        (keyword) => `${fieldName}  LIKE '%${keyword}%'`,
    );
    const result = conditions.join(" AND ");

    return result;
}

function generateAndInConditions(
    fieldName: string,
    types: string[],
): string {
    if (!types || types.length === 0) {
        return "";
    }

    const conditions = types.map(
        (type) => ` '%${type}%' `,
    );
    const result = conditions.join(" , ");

    return result;
}



function generateOrderCaseCombination(keywords: string[]): string {
    let whenCombinationSql = "";
    for (let index = 0; index < keywords.length; index++) {
        let combination = keywords.length - index;
        whenCombinationSql += generateWhenCombination(keywords, combination) + index;
    }

    let caseCombinationSql = "";
    if (whenCombinationSql) {
        caseCombinationSql = `
        CASE 
            ${whenCombinationSql}
        ELSE 99
        END,
    `;
    }
    return caseCombinationSql;
}

function generateWhenCombination(keywords: string[], combinationCount: number): string {
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
            const conditions = combination.map((item) => `content LIKE '%${item}%'`).join(" AND ");
            return `(${conditions})`;
        })
        .join(" OR ");

    return ` WHEN ${queryString} THEN `;
}