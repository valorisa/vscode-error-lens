import { extensionConfig } from 'src/extension';
import { Uri } from 'vscode';

/**
 * Cut off string if it's longer than configured number of characters.
 */
export function truncateString(str: string): string {
	return str.length > extensionConfig.messageMaxChars ? `${str.slice(0, extensionConfig.messageMaxChars)}…` : str;
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
