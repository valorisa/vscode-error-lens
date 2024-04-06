import * as vscode from 'vscode';
import { $config } from 'src/extension';
import { extUtils } from './utils/extUtils';

/**
 * ErrorCodeLensProvider
 */
export class ErrorCodeLensProvider implements vscode.CodeLensProvider {
	public onDidChangeCodeLenses: vscode.Event<void>;
	private codeLenses: vscode.CodeLens[] = [];
	private readonly _onDidChangeCodeLenses: vscode.EventEmitter<void>;
	private disposables: vscode.Disposable[];

	constructor(_: vscode.ExtensionContext) {
		this._onDidChangeCodeLenses = new vscode.EventEmitter<void>();
		this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

		this.disposables = [
			vscode.languages.registerCodeLensProvider('*', this),
			vscode.commands.registerCommand('errorLens.codeLensAction', diagnostic => {
				switch ($config.codeLensOnClick) {
					case 'showProblemWindow':
						vscode.commands.executeCommand('workbench.action.problems.focus', diagnostic);
						break;
					case 'showQuickFix':
						ErrorCodeLensProvider.setCaretInEditor(diagnostic as vscode.Diagnostic);
						vscode.commands.executeCommand('editor.action.quickFix', diagnostic);
						break;
					case 'searchForProblem':
						ErrorCodeLensProvider.setCaretInEditor(diagnostic as vscode.Diagnostic);
						vscode.commands.executeCommand('errorLens.searchForProblem', diagnostic);
						break;
					case 'none':
					default:
						break;
				}
			}),
		];
	}

	static formatMessage(diagnostic: vscode.Diagnostic): string {
		return `${ErrorCodeLensProvider.getPrefix(diagnostic)}⠀${extUtils.prepareMessage({
			template: $config.codeLensMessageTemplate,
			diagnostic,
			lineProblemCount: 1,
			removeLinebreaks: false,
			replaceLinebreaksSymbol: '',
		})}`;
	}

	static setCaretInEditor(diagnostic: vscode.Diagnostic): void {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.selection = new vscode.Selection(diagnostic.range.start, diagnostic.range.end);
			editor.revealRange(diagnostic.range);
		}
	}

	static getPrefix(diagnostic: vscode.Diagnostic): string {
		switch (diagnostic.severity) {
			case vscode.DiagnosticSeverity.Error:
				return $config.codeLensPrefix.error;
			case vscode.DiagnosticSeverity.Warning:
				return $config.codeLensPrefix.warning;
			case vscode.DiagnosticSeverity.Information:
				return $config.codeLensPrefix.info;
			case vscode.DiagnosticSeverity.Hint:
				return $config.codeLensPrefix.hint;
			default:
				return '';
		}
	}

	public provideCodeLenses(document: vscode.TextDocument, _: vscode.CancellationToken): Thenable<vscode.CodeLens[]> | vscode.CodeLens[] {
		this.codeLenses = [];
		if ($config.codeLensEnabled) {
			const diagnostics = vscode.languages.getDiagnostics(document.uri);
			for (const diagnostic of diagnostics) {
				if (!extUtils.shouldExcludeDiagnostic(diagnostic)) {
					this.codeLenses.push(new vscode.CodeLens(
						diagnostic.range,
						{
							title: ErrorCodeLensProvider.formatMessage(diagnostic),
							command: 'errorLens.codeLensAction',
							arguments: [diagnostic],
						},
					));
				}
			}
		}
		return this.codeLenses;
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, _: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
		// eslint-disable-next-line no-param-reassign
		codeLens.command = {
			title: 'Codelens provided by ErrorLens extension',
			tooltip: 'Tooltip provided by ErrorLens extension',
			command: 'errorLens.codelensAction',
			arguments: ['Diagnostic'],
		};
		return codeLens;
	}

	public dispose(): void {
		this.codeLenses = [];
		this._onDidChangeCodeLenses.dispose();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}

	public updateCodeLenses(): void {
		this._onDidChangeCodeLenses.fire();
	}
}

