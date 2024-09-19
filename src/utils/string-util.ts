import { isArrayEmpty } from "./array-util";

export function removePrefix(input: string, prefix: string): string {
    if (input.startsWith(prefix)) {
        return input.substring(prefix.length);
    } else {
        return input;
    }
}

export function removeSuffix(input: string, suffix: string): string {
    if (input.endsWith(suffix)) {
        return input.substring(0, input.length - suffix.length);
    } else {
        return input;
    }
}

export function removePrefixAndSuffix(input: string, prefix: string, suffix: string): string {
    let result = input;

    if (result.startsWith(prefix)) {
        result = result.substring(prefix.length);
    }

    if (result.endsWith(suffix)) {
        result = result.substring(0, result.length - suffix.length);
    }

    return result;
}


export function isStrNotBlank(s: any): boolean {
    if (s == undefined || s == null || s === '') {
        return false;
    }
    return true;
}

export function isStrBlank(s: any): boolean {
    return !isStrNotBlank(s);
}


export function splitKeywordStringToArray(keywordStr: string): string[] {
    let keywordArray = [];
    if (!isStrNotBlank(keywordStr)) {
        return keywordArray;
    }
    // 分离空格
    keywordArray = keywordStr.trim().replace(/\s+/g, " ").split(" ");
    if (isArrayEmpty(keywordArray)) {
        return keywordArray;
    }
    // 去重
    keywordArray = Array.from(new Set(
        keywordArray.filter((keyword) => keyword.length > 0),
    ));
    return keywordArray;

}