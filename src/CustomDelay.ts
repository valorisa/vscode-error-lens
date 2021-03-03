import throttle from 'lodash/throttle';
import { actuallyUpdateDecorations } from 'src/decorations';
import { Global } from 'src/extension';
import { AggregatedByLineDiagnostics } from 'src/types';
import vscode from 'vscode';

interface CachedDiagnostic {
	[stringUri: string]: {
		[lnmessage: string]: vscode.Diagnostic;
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
		this.delay = delay;
		this.updateDecorationsThrottled = throttle(this.updateDecorations, 200, {
			leading: false,
			trailing: true,
		});
	}

	static convertDiagnosticToId(diagnostic: vscode.Diagnostic): string { // TODO: delay happens with crash?
		return `${diagnostic.range.start.line}${diagnostic.message}`;
	}

	updateCachedDiagnosticForUri = (uri: vscode.Uri): void => {
		const stringUri = uri.toString();
		const diagnosticForUri = vscode.languages.getDiagnostics(uri);
		const cachedDiagnosticsForUri = this.cachedDiagnostics[stringUri];
		const transformed: CachedDiagnostic = {
			[stringUri]: {},
		};
		for (const item of diagnosticForUri) {
			transformed[stringUri][CustomDelay.convertDiagnosticToId(item)] = item;
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

	onDiagnosticChange = (event: vscode.DiagnosticChangeEvent): void => {
		if (!event.uris.length) {
			for (const key in this.cachedDiagnostics) {
				this.cachedDiagnostics[key] = {};
			}
			return;
		}
		for (const uri of event.uris) {
			this.updateCachedDiagnosticForUri(uri);
		}
	};

	removeItem = (stringUri: string, key: string): void => {
		delete this.cachedDiagnostics[stringUri][key];
		this.updateDecorationsThrottled(stringUri);
	};
	addItem = (uri: vscode.Uri, stringUri: string, key: string, diagnostic: vscode.Diagnostic): void => {
		setTimeout(() => {
			// Revalidate if the diagnostic actually exists at the end of the timer
			const diagnosticForUri = vscode.languages.getDiagnostics(uri);
			const transformed: CachedDiagnostic = {
				[stringUri]: {},
			};
			for (const item of diagnosticForUri) {
				transformed[stringUri][CustomDelay.convertDiagnosticToId(item)] = item;
			}
			if (!(key in transformed[stringUri])) {
				return;
			}
			this.cachedDiagnostics[stringUri][key] = diagnostic;
			this.updateDecorationsThrottled(stringUri);
		}, this.delay);
	};
	updateDecorations = (stringUri: string): void => {
		for (const editor of vscode.window.visibleTextEditors) {
			if (editor.document.uri.toString() === stringUri) {
				if (Global.excludePatterns) {
					for (const pattern of Global.excludePatterns) {
						if (vscode.languages.match(pattern, editor.document) !== 0) {
							return;
						}
					}
				}
				actuallyUpdateDecorations(editor, this.groupByLine(this.cachedDiagnostics[stringUri]));
			}
		}
	};

	groupByLine(diag: CachedDiagnostic['']): AggregatedByLineDiagnostics {
		const aggregatedDiagnostics: AggregatedByLineDiagnostics = Object.create(null);

		nextDiagnostic:
		for (const lineNumberKey in diag) {
			const diagnostic = diag[lineNumberKey];
			for (const regex of Global.excludeRegexp) {
				if (regex.test(diagnostic.message)) {
					continue nextDiagnostic;
				}
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
