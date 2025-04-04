export function paginate<T>(array: T[], pageNumber: number, pageSize: number): T[] {
    // 计算起始索引
    const startIndex = (pageNumber - 1) * pageSize;
    // 计算结束索引
    const endIndex = startIndex + pageSize;
    // 返回对应的数组片段
    return array.slice(startIndex, endIndex);
}

export function getLastItem<T>(list: T[]): T | undefined {
    return list.length > 0 ? list[list.length - 1] : undefined;
}

export function isArrayEmpty<T>(array: T[]): boolean {
    return !array || array.length == 0;
}


export function isArrayNotEmpty<T>(array: T[]): boolean {
    return Array.isArray(array) && array.length > 0;
}

export function isSetEmpty<T>(set: Set<T>): boolean {
    return !set || set.size == 0;
}

export function isSetNotEmpty<T>(set: Set<T>): boolean {
    return set && set.size > 0;
}

// 求交集。
export function intersectionArray<T>(array1: T[], array2: T[]): T[] {
    if (isArrayEmpty(array1) || isArrayEmpty(array2)) {
        return [];
    }
    // 使用 Set 来提高查找的效率
    // const set1 = new Set(array1);
    const set2 = new Set(array2);

    // 过滤 array1 中的元素，只保留那些也在 set2 中的元素
    return array1.filter(item => set2.has(item));
}


// 求交集。
export function intersectionSet<T>(set1: Set<T>, set2: Set<T>): T[] {
    if (isSetEmpty(set1) || isSetEmpty(set2)) {
        return [];
    }

    const result = [];
    for (const item of set1) {
        if (set2.has(item)) {
            result.push(item);
        }
    }
    return result;
}

export function arraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
}


export function arrayRemoveValue<T>(arr: T[], value: T): T[] {
    return arr.filter(item => item !== value);
}
