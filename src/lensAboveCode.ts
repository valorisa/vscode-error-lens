import * as vscode from 'vscode';
import { $config, $state } from 'src/extension';
import { extUtils } from './utils/extUtils';
import _ from 'lodash';

interface GroupedDiagnostic {
	range: vscode.Range;
	diagnostics: vscode.Diagnostic[];
}

/**
 * LensAboveCode 
 * 
 * @description- creates a true `Code Lens` above the code. `provideCodeLenses` is called 
 * by the application so we can't hook into the `doUpdateDecorations` like other decorators.
 * Instead, if diagnostics change, we need to call `requestUpdate` should be called to ask for a refresh.
 * 
 */
export class LensAboveCode implements vscode.CodeLensProvider {
	public onDidChangeCodeLenses: vscode.Event<void>;
	private readonly onDidChangeEventEmitter: vscode.EventEmitter<void>;
	private disposables: vscode.Disposable[];

	constructor(_extensionContext: vscode.ExtensionContext) {
		this.onDidChangeEventEmitter = new vscode.EventEmitter<void>();
		this.onDidChangeCodeLenses = this.onDidChangeEventEmitter.event;
		this.disposables = [
			this.onDidChangeEventEmitter,
			vscode.languages.registerCodeLensProvider('*', this),
			vscode.commands.registerCommand('errorLens.lensAboveCodeAction', (location: vscode.Location, diagnostics: vscode.Diagnostic[]) => {
				switch ($config.lensAboveCodeClick) {
					case 'showProblemWindow':
						$state.log(`LensAboveCode.lensAboveCodeAction: showProblemWindow`);
						vscode.commands.executeCommand('workbench.action.problems.focus');
						break;
					case 'showWebWindow':
						$state.log(`LensAboveCode.lensAboveCodeAction: showWebWindow`);
						$state.webWindow.updateFromDiagnostics(location.uri, diagnostics);
						$state.webWindow.show();
						break;
					case 'showQuickFix':
						$state.log(`LensAboveCode.lensAboveCodeAction: showQuickFix`);
						LensAboveCode.setCaretInEditor(diagnostics[0].range);
						vscode.commands.executeCommand('editor.action.quickFix', diagnostics[0]);
						break;
					case 'searchForProblem':
						$state.log(`LensAboveCode.lensAboveCodeAction: searchForProblem`);
						LensAboveCode.setCaretInEditor(diagnostics[0].range);
						vscode.commands.executeCommand('errorLens.searchForProblem', diagnostics[0]);
						break;
					case 'none':
					default:
						break;
				}
			}),
		];
	}

	static setCaretInEditor(range: vscode.Range): void {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.selection = new vscode.Selection(range.start, range.end);
			editor.revealRange(range);
		}
	}

	static getPrefix(diagnostic: vscode.Diagnostic): string {
		switch (diagnostic.severity) {
			case vscode.DiagnosticSeverity.Error:
				return $config.lensAboveCodePrefix.error;
			case vscode.DiagnosticSeverity.Warning:
				return $config.lensAboveCodePrefix.warning;
			case vscode.DiagnosticSeverity.Information:
				return $config.lensAboveCodePrefix.info;
			case vscode.DiagnosticSeverity.Hint:
				return $config.lensAboveCodePrefix.hint;
			default:
				return '';
		}
	}

	static formatDiagnostic(diagnostic: vscode.Diagnostic): string {
		return `${LensAboveCode.getPrefix(diagnostic)}⠀${extUtils.prepareMessage({
			template: $config.lensAboveCodeTemplate,
			diagnostic,
			lineProblemCount: 1,
			removeLinebreaks: true,
			replaceLinebreaksSymbol: ' ',
		})}`;
	}

	/**
	 * A Code Lens tooltip does not support markdown so we cannot use the very nicely formatted
	 * `createHoverForDiagnostic` 
	 */
	static createTooltip(group: GroupedDiagnostic): string {
		return group.diagnostics
			.map(LensAboveCode.formatDiagnostic)
			.join('\n');
	}

	/**
	 * Show multiple diagnostics by controlling the truncation favouring the first one.
	 * 
	 * Code lens text rendering sometimes removes whitespace so choosing to use a braille 
	 * space to separate the messages to get something more reliable
	 */
	static createTitle(group: GroupedDiagnostic): string {
		let result = LensAboveCode.formatDiagnostic(group.diagnostics[0]);

		if (result.length > $config.lensAboveCodeMaxLength) {
			result = `${result.substring(0, $config.lensAboveCodeMaxLength)}…`;
		}

		if (group.diagnostics.length > 1) {
			for (const diagnostic of group.diagnostics.slice(1)) {
				const message = LensAboveCode.formatDiagnostic(diagnostic);
				result += `\u{2800}|\u{2800}${ 
					((result.length + message.length > $config.lensAboveCodeMaxLength) ?
						`${message.substring(0, $config.lensAboveCodeMinLength)}…` :
						message)}`;
			}
		}

		return result;
	}

	/**
	 * Group diagnostics by line number - similar to `doUpdateDecorations`
	 * but the code lens is triggered by a different event
	 */
	public static getGroupedDiagnostics(uri: vscode.Uri): GroupedDiagnostic[] {
		return _(vscode.languages.getDiagnostics(uri))
			.groupBy(diagnostic => diagnostic.range.start.line)
			.map((diagnostics, _key) => ({
				range: diagnostics
					.map(d => d.range)
					.reduce((d1, d2) => d1.union(d2)),
				diagnostics: diagnostics
					.sort((a, b) => (a.range.start.line - b.range.start.line) ||
						(a.severity - b.severity) ||
						(a.range.start.character - b.range.start.character) ||
						(a.message.length - b.message.length)),
			}))
			.orderBy(g => g.range.start.line)
			.value();
	}

	/**
	 * Called by Vscode to provide code lenses
	 */
	public provideCodeLenses(document: vscode.TextDocument, _cancellationToken: vscode.CancellationToken): Thenable<vscode.CodeLens[]> | vscode.CodeLens[] {
		return (!$config.lensAboveCodeEnabled || extUtils.shouldExcludeWindow(document.uri)) ?
			[] :
			LensAboveCode
				.getGroupedDiagnostics(document.uri)
				.map(group => new vscode.CodeLens(
					group.range,
					{
						title: LensAboveCode.createTitle(group),
						command: 'errorLens.lensAboveCodeAction',
						tooltip: LensAboveCode.createTooltip(group),
						arguments: [new vscode.Location(document.uri, group.range), group.diagnostics],
					},
				));
	}

	/**
	 * Called by Vscode - AFAIK there is nothing to resolve
	 */
	public resolveCodeLens(codeLens: vscode.CodeLens, _cancellationToken: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {	
		return codeLens;
	}

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}

	public requestUpdate(): void {
		$state.log(`LensAboveCode.requestUpdate`);
		this.onDidChangeEventEmitter.fire();
	}
}

