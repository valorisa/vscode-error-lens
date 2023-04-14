import { Constants } from 'src/types';
import { utils } from 'src/utils/utils';
import { ConfigurationTarget, Range, Selection, TextEditorRevealType, Uri, commands, window, workspace, type TextDocument, type TextEditor } from 'vscode';

/**
 * Update global settings.json file with the new settign value.
 */
async function updateGlobalSetting(settingId: string, newValue: unknown): Promise<void> {
	const vscodeConfig = workspace.getConfiguration();
	await vscodeConfig.update(settingId, newValue, ConfigurationTarget.Global);
}

/**
 * Transform string svg to {@link Uri}
 */
function svgToUri(svg: string): Uri {
	return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
}

/**
 * Open vscode Settings GUI with input value set to the specified value.
 */
async function openSettingGuiAt(settingName: string): Promise<void> {
	await commands.executeCommand('workbench.action.openSettings', settingName);
}
/**
 * Create [Command URI](https://code.visualstudio.com/api/extension-guides/command#command-uris).
 */
function createCommandUri(commandId: string, args?: unknown): Uri {
	const commandArg = args ? `?${encodeURIComponent(JSON.stringify(args))}` : '';
	return Uri.parse(`command:${commandId}${commandArg}`);
}
function revealLine(editor: TextEditor, lineNumber: number): void {
	const range = new Range(lineNumber, 0, lineNumber, 0);
	editor.selection = new Selection(range.start, range.end);
	editor.revealRange(range, TextEditorRevealType.AtTop);
	// Highlight for a short time revealed range
	const lineHighlightDecorationType = window.createTextEditorDecorationType({
		backgroundColor: '#ffa30468',
		isWholeLine: true,
	});
	editor.setDecorations(lineHighlightDecorationType, [range]);
	setTimeout(() => {
		editor.setDecorations(lineHighlightDecorationType, []);
		lineHighlightDecorationType?.dispose();
	}, 700);
}

/** VSCode span accepts only #fff #fff0 #fffff #ffffff00 var(--vscode...) color formats. */
type ColorFormat = `#${string}` | `var(--vscode-${string}`;
/**
 * Create a styled span to use in MarkdownString.
 *
 * `editorError.foreground` => `--vscode-editorError-foreground`
 */
function createStyledMarkdown({
	strMd = '',
	backgroundColor = 'var(--vscode-editorHoverWidget-background)',
	color = 'var(--vscode-editorHoverWidget-foreground)',
}: {
	strMd?: string;
	backgroundColor?: ColorFormat;
	color?: string;
}): string {
	const colorStyle = color ? `color:${color};` : '';
	const backgroundStyle = backgroundColor ? `background-color:${backgroundColor};` : '';
	return `<span style="${colorStyle}${backgroundStyle}">${strMd}</span>`;
}

function createButtonLinkMarkdown({
	text,
	href,
	title = '',
}: {
	text: string;
	href: string;
	title?: string;
}): string {
	const buttonText = vscodeUtils.createStyledMarkdown({
		strMd: utils.surround(text, Constants.NonBreakingSpaceSymbolHtml),
		backgroundColor: 'var(--vscode-button-background)',
		color: 'var(--vscode-button-foreground)',
	});

	return `<a title="${title}" href="${href}">${buttonText}</a>`;
}

function createProblemIconMarkdown(kind: 'error' | 'info' | 'warning'): string {
	const colorClass: ColorFormat = kind === 'error' ?
		'var(--vscode-editorError-foreground)' :
		kind === 'warning' ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-editorInfo-foreground)';
	return vscodeUtils.createStyledMarkdown({
		strMd: `$(${kind})`,
		color: colorClass,
	});
}

async function readFileVscode(pathOrUri: Uri | string): Promise<string> {
	try {
		const uri = typeof pathOrUri === 'string' ? Uri.file(pathOrUri) : pathOrUri;
		const file = await workspace.fs.readFile(uri);
		// @ts-expect-error TextDecoder EXISTS
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		return new TextDecoder().decode(file);
	} catch (e) {
		window.showErrorMessage((e as Error).message);
		return '';
	}
}
async function openFileInVscode(pathOrUri: Uri | string): Promise<TextEditor> {
	let document: TextDocument;
	if (typeof pathOrUri === 'string') {
		document = await workspace.openTextDocument(pathOrUri);
	} else {
		document = await workspace.openTextDocument(pathOrUri);
	}
	return window.showTextDocument(document);
}

export const vscodeUtils = {
	updateGlobalSetting,
	svgToUri,
	createCommandUri,
	openSettingGuiAt,
	createStyledMarkdown,
	createButtonLinkMarkdown,
	createProblemIconMarkdown,
	readFileVscode,
	openFileInVscode,
	revealLine,
};
