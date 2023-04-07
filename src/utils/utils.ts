/**
 * Cut off string if it's longer than provided number of characters.
 */
function truncateString(str: string, max: number): string {
	const chars = [...str];
	return chars.length > max ? `${chars.slice(0, max).join('')}…` : str;
}
/**
 * Replace linebreaks with the one whitespace symbol.
 */
function replaceLinebreaks(str: string, replaceSymbol: string): string {
	return str.replace(/[\n\r\t]+/gu, replaceSymbol);
}
/**
 * To work on the web - use this instead of `path.basename`.
 */
function basename(filePath: string): string {
	return filePath.split(/[\\/]/u).pop() ?? '';
}
/**
 * Add text at the start and at the end.
 */
function surround(str: string, surroundStr: string): string {
	return `${surroundStr}${str}${surroundStr}`;
}

export const utils = {
	truncateString,
	replaceLinebreaks,
	basename,
	surround,
};
