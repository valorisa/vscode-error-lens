import { $config } from 'src/extension';
import { Uri } from 'vscode';

/**
 * Cut off string if it's longer than configured number of characters.
 */
export function truncateString(str: string): string {
	const chars = [...str];
	return chars.length > $config.messageMaxChars ? `${chars.slice(0, $config.messageMaxChars).join('')}…` : str;
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
