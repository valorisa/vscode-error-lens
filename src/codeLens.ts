import { CommandId } from 'src/commands';
import { $config, $state } from 'src/extension';
import { Constants } from 'src/types';
import { utils } from 'src/utils/utils';
import { CodeLens, EventEmitter, Range, languages, type CancellationToken, type CodeLensProvider, type Diagnostic, type Disposable, type Event, type ExtensionContext, type TextDocument } from 'vscode';
import { extUtils } from './utils/extUtils';

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

	formatDiagnostic(diagnostic: Diagnostic): string {
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
	createTooltip(diagnostics: Diagnostic[]): string {
		return diagnostics
			.map(this.formatDiagnostic)
			.join('\n');
	}

	/**
	 * Format and truncate/pad diagnostic message if needed depending on user settings.
	 */
	createTitle(diagnostic: Diagnostic): string {
		const formattedDiagnostic = this.formatDiagnostic(diagnostic);
		return utils.truncateString(formattedDiagnostic, $config.codeLensLength.max)
			.padEnd($config.codeLensLength.min, Constants.NonBreakingSpaceSymbol);
	}

	/**
	 * Called by Vscode to provide code lenses
	 */
	provideCodeLenses(document: TextDocument, _cancellationToken: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
		if (!this.isEnabled()) {
			return [];
		}

		// TODO: duplicate code in `decorations.ts`
		if ($state.excludePatterns) {
			for (const pattern of $state.excludePatterns) {
				if (languages.match(pattern, document) !== 0) {
					return [];
				}
			}
		}

		const groupedDiagnostic = extUtils.groupDiagnosticsByLine(languages.getDiagnostics(document.uri));

		const codeLens: CodeLens[] = [];

		for (const lineNumber in groupedDiagnostic) {
			const diagnosticsAtLine = groupedDiagnostic[lineNumber];

			for (const diagnostic of diagnosticsAtLine) {
				codeLens.push(new CodeLens(
					new Range(Number(lineNumber), 0, Number(lineNumber), 0),
					{
						title: this.createTitle(diagnostic),
						command: CommandId.CodeLensOnClick,
						tooltip: this.createTooltip(diagnosticsAtLine),
						arguments: [
							diagnostic,
						],
					},
				));
			}
		}

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

