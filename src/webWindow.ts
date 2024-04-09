import * as vscode from 'vscode';
import { $config, $state } from 'src/extension';
import { LensAboveCode } from './lensAboveCode';
import { Constants } from './types';
import { utils } from './utils/utils';
import { vscodeUtils } from './utils/vscodeUtils';
import { CommandId } from './commands';
import { extUtils } from './utils/extUtils';

interface QuickFixArgs {
	uri: string; startLine: number; startChar: number; endLine: number; endChar: number; diagnosticArg: string; 
}
function makeQuickFixArgs(uri: vscode.Uri, diagnostic: vscode.Diagnostic): QuickFixArgs {
	return {
		uri: uri.toString(),
		startLine: diagnostic.range.start.line,
		startChar: diagnostic.range.start.character,
		endLine: diagnostic.range.end.line,
		endChar: diagnostic.range.end.character,
		diagnosticArg: JSON.stringify(diagnostic),
	};
}

/**
 * WebWindow - show diagnostics in a webview called 'Error Lens'
 */
export class WebWindow {
	private lastText = '';
	private webPanel: vscode.WebviewPanel | undefined;
	private readonly extensionUri: vscode.Uri;
	private disposables: vscode.Disposable[];

	constructor(extensionContext: vscode.ExtensionContext) {
		$state.log(`WebWindow.constructor`);
		this.webPanel = undefined;
		this.extensionUri = extensionContext.extensionUri;
		this.disposables = [
			vscode.commands.registerCommand('errorLens.grr', () => {
				$state.log(`WebWindow.webViewQuickFix: grr`);
			}),	
			vscode.commands.registerCommand('errorLens.webViewQuickFix', (args: QuickFixArgs) => {
				const { uri, startLine, startChar, endLine, endChar, diagnosticArg } = args;
				const range = new vscode.Range(startLine, startChar, endLine, endChar);				
				$state.log(`WebWindow.webViewQuickFix: ${diagnosticArg}`);

				function quickFix(editor: vscode.TextEditor): void {					
					editor.revealRange(range, vscode.TextEditorRevealType.Default);					
					editor.selection = new vscode.Selection(new vscode.Position(startLine, startChar), new vscode.Position(endLine, endChar));
					vscode.commands.executeCommand('editor.action.quickFix', range).then(__ => {
						$state.log(`WebWindow.webViewQuickFix complete`);
					});
				}

				const activeEditor = vscode.window.activeTextEditor;

				// We have to set focus for the quick fix command to work.
				// After clicking on the webview, the active editor is rarely the one we want and we have to
				// set focus using showTextDocument for the quick fix command to work
				if (activeEditor &&
					activeEditor.document.uri.toString() === uri) {
					$state.log(`WebWindow.webViewQuickFix: active`);					
					vscode.window.showTextDocument(activeEditor.document, activeEditor.viewColumn, false).then(editor => {	
						quickFix(editor);
					});
				} else {
					for (const editor of vscode.window.visibleTextEditors) {					
						if (editor.document.uri.toString() === uri) {
							$state.log(`WebWindow.webViewQuickFix: visible`);
							vscode.window.showTextDocument(editor.document, editor.viewColumn, false).then(ed => {								
								quickFix(ed);
							});
							return;
						}
					}
					vscode.window.showTextDocument(vscode.Uri.parse(uri)).then(editor => {
						$state.log(`WebWindow.webViewQuickFix: open`);
						quickFix(editor);
					});
				}
			}),
		];
	}
	
	static createButton({ text, commandId, commandArg, title }: { text: string; commandId: string; commandArg: object; title: string }): string {
		const href = vscodeUtils.createCommandUri(commandId, commandArg).toString();
		return `<a class="errorlens-button" title="${title}" href="${href}">${utils.surround(text, Constants.NonBreakingSpaceSymbolHtml)}</a>`;
	}

	static getHtmlSeverity(diagnostic: vscode.Diagnostic): string {			
		switch (diagnostic.severity) {
			case vscode.DiagnosticSeverity.Error:
				return `<span class="errorlens-error">Error</span>`;				
			case vscode.DiagnosticSeverity.Warning:
				return `<span class="errorlens-warning">Warning</span>`;
			case vscode.DiagnosticSeverity.Information:
				return `<span class="errorlens-info">Info</span>`;
			case vscode.DiagnosticSeverity.Hint:
				return `<span class="errorlens-hint">Hint</span>`;
			default:
				return '';
		}
	}	

	/**
	 * An unscrupulous extension author could create diagnostic messages that do something evil in a webview.
	 * This is a lazy way to sanitize user input without pulling in 3rd party library by using vscode's MarkdownString
	 * that says it does sanitization.
	 * 
	 */
	static sanitizeUserString(html: string): string {
		const md = new vscode.MarkdownString(html.trim());
		md.supportHtml = true;
		md.isTrusted = false;
		return md.value;
	}
	
	getWebview(): vscode.Webview {
		if (this.webPanel === undefined) {
			this.webPanel = vscode.window.createWebviewPanel(
				'errorLens', 
				'Error Lens', 
				{ viewColumn: vscode.ViewColumn.Two, preserveFocus: true }, 
				{ enableScripts: true, retainContextWhenHidden: true, enableCommandUris: true },
			);
			this.lastText = '';
		}
		return this.webPanel.webview;
	}

	public setWindowHtml(text: string): void {
		if (this.lastText !== text) {
			$state.log(`WebWindow.setWindowText: ${text}`);
			this.getWebview().html = text;
			this.lastText = text;
		}
	}

	public updateFromDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[], cursorLine?: number): void {
		$state.log(`WebWindow.updateFromDiagnostics: ${uri.toString()}`);

		let body = '';

		for (const diagnostic of diagnostics) {			
			const diagnosticCode = extUtils.getDiagnosticCode(diagnostic);

			const searchButton =
				WebWindow.createButton({ text: 'Search',
					commandId: CommandId.SearchForProblem, 
					commandArg: diagnostic, 
					title: 'Open problem in default browser (controlled by `errorLens.searchForProblemQuery` setting)' });

			const quickFixButton =
				WebWindow.createButton({ text: 'Quick Fix',
					commandId: 'errorLens.webViewQuickFix', 
					commandArg: makeQuickFixArgs(uri, diagnostic), 
					title: 'Open the quick fix menu.' });

			body += 
				`<div class="errorlens-diagnostic">
					<div class="errorlens-column0 errorlens-severity">
						${WebWindow.getHtmlSeverity(diagnostic)}
					</div>
					<div class="errorlens-column1">
						<div class="errorlens-message">${WebWindow.sanitizeUserString(diagnostic.message)}</div>
						<div class="errorlens-row">
							<div class="errorlens-source">${diagnostic.source ?? '<No source>'}(\`${diagnosticCode ?? '<No code>'}\`)</div>
							<div class="errorlens-buttons">																		
								${searchButton}
								${quickFixButton}
							</div>
						</div>
					</div>														
				</div>
				`;
		}

		const html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Error Lens</title>				
				<style>					
					.errorlens-diagnostic-list {
						width: 100%;
						margin-left: 3px;
					}					
					.errorlens-diagnostic {
						display: flex;						
						padding-top: 16px;
						padding-bottom: 16px;
						width: 100%;
						border-bottom: 1px solid var(--vscode-editorWidget-border);
					}					
					.errorlens-diagnostic:last-child {
						border-bottom: none;
					}
					.errorlens-column0 {
						flex-grow: 0;
						flex-shrink: 0;
						flex-basis: 75px;
					}
					.errorlens-column1 {
						flex-grow: 1;
					}
					.errorlens-severity {
						font-family: var(--vscode-editor-font-family);
						font-weight: bold;
					}				
					.errorlens-message {						
						font-family: var(--vscode-editor-font-family);						
					}
					.errorlens-row {
						padding-top: 10px;
						display: flex;
						flex-direction: column;
					}
					.errorlens-source {
						padding-top: 10px;
						font-family: var(--vscode-editor-font-family);
					}
					.errorlens-buttons {
						display: flex;
						justify-content: flex-end;
						width: 100%;
					}
					.errorlens-buttons a {
						margin-right: 10px;
					}					
					.errorlens-buttons a:last-child {
						margin-right: 0;
					}										
					.errorlens-button {
						font-family: var(--vscode-font-family);
						font-size: 0.9em;
						padding: 3px 6px 3px 6px;
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						text-decoration: none;
						display: inline-block;
						transition: background-color 0.3s ease;
					}
					.errorlens-button:hover {
						background-color: var(--vscode-button-hoverBackground);
					}					
					.errorlens-error {
						color: var(--vscode-errorForeground);
					}
					.errorlens-warning {
						color: var(--vscode-warningForeground);						
					}
					.errorlens-info {
						color: var(--vscode-infoForeground);
					}
					.errorlens-hint {
						color: var(--vscode-hintForeground);
					}					
				</style>
				</head>
			<body>		
				<div class="errorlens-diagnostic-list">
					${body}
				</div>
			</body>
		</html>`;			

		this.setWindowHtml(html);
	}

	/**
	 * To be called to sync the output window to the cursor position.
	 */
	public updateFromCursor(uri: vscode.Uri, line: number): void {
		if ($config.webWindowEnabled) {
			$state.log(`WebWindow.updateFromCursor: ${uri.toString()}`);

			const groupedByLine = LensAboveCode.getGroupedDiagnostics(uri);

			if (groupedByLine.length > 0) {
				const closestLine = groupedByLine.reduce((prev, curr) => (Math.abs(curr.range.start.line - line) < Math.abs(prev.range.start.line - line) ? curr : prev));

				this.updateFromDiagnostics(uri, closestLine.diagnostics, line);
			} else {
				this.setWindowHtml('');
			}
		}
	}

	public show(): void {
		$state.log(`WebWindow.show`);
		this.webPanel?.reveal();
	}

	public dispose(): void {
		$state.log(`WebWindow.dispose`);
		this.lastText = '';
		this.webPanel?.dispose();
		this.webPanel = undefined;
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}
