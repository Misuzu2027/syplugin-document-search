export function getObjectSizeInKB(obj: any): number {
    try {
        // 将 JSON 对象转换为字符串
        const jsonString = JSON.stringify(obj);

        // 计算字符串的字节数
        const bytes = new Blob([jsonString]).size;

        // 将字节数转换为 KB
        const kilobytes = bytes / 1024;
        return kilobytes;
    } catch (err) {
        console.log("计算对象大小报错")
    }
    return 0;
}