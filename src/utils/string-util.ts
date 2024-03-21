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

