export function isNumberValid(value: any): boolean {
    // 判断值是否存在且为数字
    return value !== null && value !== undefined && typeof value === 'number' && !isNaN(value);
}
export function isNumberNotValid(value: any): boolean {
    return !isNumberValid(value);
}
