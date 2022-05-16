import { Uri } from 'vscode';

/**
 * Cut off string if it's longer than provided number of characters.
 */
export function truncateString(str: string, max: number): string {
	const chars = [...str];
	return chars.length > max ? `${chars.slice(0, max).join('')}…` : str;
}
/**
 * Replace linebreaks with the one whitespace symbol.
 */
export function replaceLinebreaks(str: string): string {
	return str.replace(/[\n\r\t]+/g, ' ');
}
/**
 * Transform string svg to {@link Uri}
 */
export function svgToUri(svg: string): Uri {
	return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
}
