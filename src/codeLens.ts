import _ from 'lodash';
import { CommandId } from 'src/commands';
import { $config } from 'src/extension';
import { Constants } from 'src/types';
import { utils } from 'src/utils/utils';
import { CodeLens, EventEmitter, Location, languages, type CancellationToken, type CodeLensProvider, type Diagnostic, type Disposable, type Event, type ExtensionContext, type ProviderResult, type Range, type TextDocument, type Uri } from 'vscode';
import { extUtils } from './utils/extUtils';

interface GroupedDiagnostic {
	range: Range;
	diagnostics: Diagnostic[];
}

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

	static formatDiagnostic(diagnostic: Diagnostic): string {
		return extUtils.prepareMessage({
			template: $config.codeLensTemplate,
			diagnostic,
			lineProblemCount: 1,
			removeLinebreaks: true,
			replaceLinebreaksSymbol: $config.replaceLinebreaksSymbol,
		});
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
	 * Show multiple diagnostics and truncate/pad if needed depending on user settings.
	 */
	static createTitle(group: GroupedDiagnostic): string {
		return group.diagnostics.map(diagnostic => {
			const formattedDiagnostic = ErrorLensCodeLens.formatDiagnostic(diagnostic);
			return utils.truncateString(formattedDiagnostic, $config.codeLensLength.max)
				.padEnd($config.codeLensLength.min, Constants.NonBreakingSpaceSymbol);
		}).join(' | ');
	}

	/**
	 * TODO: duplicates extUtils.groupDiagnosticsByLine()
	 * Group diagnostics by line number - similar to `doUpdateDecorations`
	 * but the code lens is triggered by a different event
	 */
	public static getGroupedDiagnostics(uri: Uri): GroupedDiagnostic[] {
		return _(languages.getDiagnostics(uri))
			.filter(diagnostic => !extUtils.shouldExcludeDiagnostic(diagnostic))
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
	provideCodeLenses(document: TextDocument, _cancellationToken: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
		if (!this.isEnabled()) {
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
	resolveCodeLens(codeLens: CodeLens, _cancellationToken: CancellationToken): ProviderResult<CodeLens> {
		return codeLens;
	}

	isEnabled(): boolean {
		return (
			$config.enabled &&
			$config.codeLensEnabled
		);
	}

	update(): void {
		this.onDidChangeEventEmitter.fire();
	}

	dispose(): void {
		this.update();

		setInterval(() => {
			for (const disposable of this.disposables) {
				disposable?.dispose();
			}
			this.disposables = [];
		}, 500);
	}
}

