import throttle from 'lodash/throttle';
import { doUpdateDecorations, shouldExcludeDiagnostic } from 'src/decorations';
import { Global } from 'src/extension';
import { AggregatedByLineDiagnostics } from 'src/types';
import { Diagnostic, DiagnosticChangeEvent, languages, Uri, window } from 'vscode';

interface CachedDiagnostic {
	[stringUri: string]: {
		[lnmessage: string]: Diagnostic;
	};
}
/**
 * Try to add delay to new decorations.
 * But old fixed errors should be removed immediately.
 */
export class CustomDelay {
	/**
	 * Delay of adding a new decoration
	 */
	private readonly delay: number;
	/**
	 * Saved diagnostics for each Uri.
	 */
	private cachedDiagnostics: CachedDiagnostic = {};
	private readonly updateDecorationsThrottled: (stringUri: string)=> void;

	constructor(delay: number) {
		this.delay = Math.max(delay, 500);
		this.updateDecorationsThrottled = throttle(this.updateDecorations, 300, {
			leading: true,
			trailing: true,
		});
	}

	static convertDiagnosticToId(diagnostic: Diagnostic): string {
		return `${diagnostic.range.start.line}__${diagnostic.message}`;
	}

	updateCachedDiagnosticForUri = (uri: Uri) => {
		const stringUri = uri.toString();
		const diagnosticForUri = languages.getDiagnostics(uri);
		const cachedDiagnosticsForUri = this.cachedDiagnostics[stringUri];
		const transformed: CachedDiagnostic = {
			[stringUri]: {},
		};
		for (const item of diagnosticForUri) {
			if (transformed[stringUri]) {
				transformed[stringUri][CustomDelay.convertDiagnosticToId(item)] = item;
			}
		}
		// If there's no uri saved - save it and render all diagnostics
		if (!cachedDiagnosticsForUri) {
			this.cachedDiagnostics[stringUri] = transformed[stringUri];
			setTimeout(() => {
				this.updateDecorationsThrottled(stringUri);
			}, this.delay);
		} else {
			const transformedDiagnosticForUri = transformed[stringUri];
			const cachedKeys = Object.keys(cachedDiagnosticsForUri);
			const transformedKeys = Object.keys(transformedDiagnosticForUri);

			for (const key of cachedKeys) {
				if (!transformedKeys.includes(key)) {
					this.removeItem(stringUri, key);
				}
			}
			for (const key of transformedKeys) {
				if (!cachedKeys.includes(key)) {
					this.addItem(uri, stringUri, key, transformedDiagnosticForUri[key]);
				}
			}
		}
	};

	onDiagnosticChange = (event: DiagnosticChangeEvent) => {
		if (!event.uris.length) {
			this.cachedDiagnostics = {};
			return;
		}
		for (const uri of event.uris) {
			this.updateCachedDiagnosticForUri(uri);
		}
	};

	removeItem = (stringUri: string, key: string) => {
		delete this.cachedDiagnostics[stringUri]?.[key];
		this.updateDecorationsThrottled(stringUri);
	};
	addItem = (uri: Uri, stringUri: string, key: string, diagnostic: Diagnostic) => {
		setTimeout(() => {
			// Revalidate if the diagnostic actually exists at the end of the timer
			const diagnosticForUri = languages.getDiagnostics(uri);
			const transformed: CachedDiagnostic = {
				[stringUri]: {},
			};
			for (const item of diagnosticForUri) {
				if (transformed[stringUri]) {
					transformed[stringUri][CustomDelay.convertDiagnosticToId(item)] = item;
				}
			}
			if (!(key in transformed[stringUri])) {
				return;
			}
			if (this.cachedDiagnostics[stringUri]) {
				this.cachedDiagnostics[stringUri][key] = diagnostic;
			}
			this.updateDecorationsThrottled(stringUri);
		}, this.delay);
	};
	updateDecorations = (stringUri: string) => {
		for (const editor of window.visibleTextEditors) {
			if (editor.document.uri.toString() === stringUri) {
				if (Global.excludePatterns) {
					for (const pattern of Global.excludePatterns) {
						if (languages.match(pattern, editor.document) !== 0) {
							return;
						}
					}
				}
				doUpdateDecorations(editor, this.groupByLine(this.cachedDiagnostics[stringUri]));
			}
		}
	};

	groupByLine(diag: CachedDiagnostic['']): AggregatedByLineDiagnostics {
		const aggregatedDiagnostics: AggregatedByLineDiagnostics = Object.create(null);

		for (const lineNumberKey in diag) {
			const diagnostic = diag[lineNumberKey];
			if (shouldExcludeDiagnostic(diagnostic)) {
				continue;
			}

			const key = diagnostic.range.start.line;

			if (aggregatedDiagnostics[key]) {
				aggregatedDiagnostics[key].push(diagnostic);
			} else {
				aggregatedDiagnostics[key] = [diagnostic];
			}
		}
		return aggregatedDiagnostics;
	}
}
