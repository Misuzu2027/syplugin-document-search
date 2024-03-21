
export function parseDateTimeInBlock(dateTimeString: string): Date | null {
    if (dateTimeString.length !== 14) {
        console.error("Invalid date time string format. It should be 'yyyyMMddhhmmss'.");
        return null;
    }

    const year = parseInt(dateTimeString.slice(0, 4), 10);
    const month = parseInt(dateTimeString.slice(4, 6), 10) - 1; // 月份从 0 开始
    const day = parseInt(dateTimeString.slice(6, 8), 10);
    const hour = parseInt(dateTimeString.slice(8, 10), 10);
    const minute = parseInt(dateTimeString.slice(10, 12), 10);
    const second = parseInt(dateTimeString.slice(12, 14), 10);

    return new Date(year, month, day, hour, minute, second);
}


export function convertDateTimeInBlock(dateTimeString: string): string {
    if (dateTimeString.length !== 14) {
        console.error("Invalid date time string format. It should be 'yyyyMMddhhmmss'.");
        return null;
    }
    const year = dateTimeString.slice(0, 4);
    const month = dateTimeString.slice(4, 6);
    const day = dateTimeString.slice(6, 8);
    const hour = dateTimeString.slice(8, 10);
    const minute = dateTimeString.slice(10, 12);
    const second = dateTimeString.slice(12, 14);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}



export function formatRelativeTimeInBlock(dateTimeString: string): string {
    let timestamp = parseDateTimeInBlock(dateTimeString).getTime();
    return formatRelativeTime(timestamp);
}


export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) {
        return `${Math.floor(diff / 1000)}秒前`;
    } else if (diff < hour) {
        return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
        return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < month) {
        return `${Math.floor(diff / day)}天前`;
    } else if (diff < year) {
        return `${Math.floor(diff / month)}个月前`;
    } else {
        return `${Math.floor(diff / year)}年前`;
    }
}
