import _ from 'lodash';
import { $config, $state } from 'src/extension';
import { CodeLens, EventEmitter, Location, Selection, commands, languages, window, type CancellationToken, type CodeLensProvider, type Diagnostic, type Disposable, type Event, type ExtensionContext, type ProviderResult, type Range, type TextDocument, type Uri } from 'vscode';
import { extUtils } from './utils/extUtils';
import { CommandId } from 'src/commands';

interface GroupedDiagnostic {
	range: Range;
	diagnostics: Diagnostic[];
}
// TODO: doesn't honour "enabledDiagnosticLevels"
/**
 * Creates a `Code Lens` above the code. `provideCodeLenses` is called
 * by the application so we can't hook into the `doUpdateDecorations` like other decorators.
 * Instead, if diagnostics change, we need to call `requestUpdate` should be called to ask for a refresh.
 */
export class ErrorLensCodeLens implements CodeLensProvider {
	public onDidChangeCodeLenses: Event<void>;
	private readonly onDidChangeEventEmitter: EventEmitter<void>;
	private disposables: Disposable[];

	constructor(_extensionContext: ExtensionContext) {
		this.onDidChangeEventEmitter = new EventEmitter<void>();
		this.onDidChangeCodeLenses = this.onDidChangeEventEmitter.event;

		this.disposables = [
			this.onDidChangeEventEmitter,
			languages.registerCodeLensProvider('*', this),
		];
	}

	static setCaretInEditor(range: Range): void {
		const editor = window.activeTextEditor;
		if (editor) {
			editor.selection = new Selection(range.start, range.end);
			editor.revealRange(range);
		}
	}

	static getPrefix(diagnostic: Diagnostic): string {
		switch (diagnostic.severity) {
			case 0:
				return $config.codeLensPrefix.error;
			case 1:
				return $config.codeLensPrefix.warning;
			case 2:
				return $config.codeLensPrefix.info;
			case 3:
				return $config.codeLensPrefix.hint;
			default:
				return '';
		}
	}

	static formatDiagnostic(diagnostic: Diagnostic): string {
		return `${ErrorLensCodeLens.getPrefix(diagnostic)} ${extUtils.prepareMessage({
			template: $config.codeLensTemplate,
			diagnostic,
			lineProblemCount: 1,
			removeLinebreaks: true,
			replaceLinebreaksSymbol: ' ',
		})}`;
	}

	/**
	 * A Code Lens tooltip does not support markdown https://github.com/microsoft/vscode/issues/154063
	 * so we cannot use the very nicely formatted `createHoverForDiagnostic`
	 */
	static createTooltip(group: GroupedDiagnostic): string {
		return group.diagnostics
			.map(ErrorLensCodeLens.formatDiagnostic)
			.join('\n');
	}

	/**
	 * Show multiple diagnostics by controlling the truncation favouring the first one.
	 */
	static createTitle(group: GroupedDiagnostic): string {
		let result = ErrorLensCodeLens.formatDiagnostic(group.diagnostics[0]);

		if (result.length > $config.codeLensMaxLength) {
			result = `${result.substring(0, $config.codeLensMaxLength)}…`;
		}

		if (group.diagnostics.length > 1) {
			for (const diagnostic of group.diagnostics.slice(1)) {
				const message = ErrorLensCodeLens.formatDiagnostic(diagnostic);
				result += ` | ${
					((result.length + message.length > $config.codeLensMaxLength) ?
						`${message.substring(0, $config.codeLensMinLength)}…` :
						message)}`;
			}
		}

		return result;
	}

	/**
	 * Group diagnostics by line number - similar to `doUpdateDecorations`
	 * but the code lens is triggered by a different event
	 */
	public static getGroupedDiagnostics(uri: Uri): GroupedDiagnostic[] {
		return _(languages.getDiagnostics(uri))
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
	public provideCodeLenses(document: TextDocument, _cancellationToken: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
		if (!$config.codeLensEnabled) {
			return [];
		}

		return ErrorLensCodeLens
			.getGroupedDiagnostics(document.uri)
			.map(group => new CodeLens(
				group.range,
				{
					title: ErrorLensCodeLens.createTitle(group),
					command: CommandId.CodeLensOnClick,
					tooltip: ErrorLensCodeLens.createTooltip(group),
					arguments: [
						new Location(document.uri, group.range),
						group.diagnostics,
					],
				},
			));
	}

	/**
	 * Called by Vscode - AFAIK there is nothing to resolve
	 */
	public resolveCodeLens(codeLens: CodeLens, _cancellationToken: CancellationToken): ProviderResult<CodeLens> {
		return codeLens;
	}

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable?.dispose();
		}
		this.disposables = [];
	}

	public update(): void {
		this.onDidChangeEventEmitter.fire();
	}
}

