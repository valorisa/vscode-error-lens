/**
 * Cut off string if it's longer than **500** characters.
 */
export function truncateString(str: string): string {
	const charLimit = 500;
	return str.length > charLimit ? `${str.slice(0, charLimit)}…` : str;
}
/**
 * Replace linebreaks with the one whitespace symbol.
 */
export function replaceLinebreaks(str: string): string {
	return str.replace(/[\n\r\t]+?/g, ' ');
}
