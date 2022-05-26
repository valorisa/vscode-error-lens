import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import { groupDiagnosticsByLine, updateDecorationsForUri } from 'src/decorations';
import { Diagnostic, DiagnosticChangeEvent, languages, Uri, window } from 'vscode';

interface CachedDiagnostic {
	[stringUri: string]: {
		[lnmessage: string]: Diagnostic;
	};
}

export class CustomDelay {
	/**
	 * Delay of adding a new decoration
	 */
	private readonly delay: number;
	/**
	 * Saved diagnostics for each Uri.
	 */
	private cachedDiagnostics: CachedDiagnostic = {};
	/**
	 * Do not update more often than once in 300ms to avoid flickering.
	 */
	private readonly updateDecorationsThrottled: (uri: Uri)=> void;
	/**
	 * Function that uses user delay setting `errorLens.delay` to debounce rendering of NEW problems.
	 */
	private readonly updateDecorationsDebounced: (uri: Uri)=> void;

	/**
	 * Try to add delay to new decorations.
	 * But old fixed errors should be removed immediately.
	 */
	constructor(delay: number) {
		this.delay = Math.max(delay, 500) || 500;

		this.updateDecorationsThrottled = throttle(this.updateDecorations, 300, {
			leading: true,
			trailing: true,
		});
		this.updateDecorationsDebounced = debounce(this.updateDecorationsThrottled, this.delay, {
			leading: false,
			trailing: true,
		});
	}

	/**
	 * Make id from diagnostic:
	 *
	 * ```js
	 * "1_Missing semicolon"
	 * ```
	 */
	convertDiagnosticToId(diagnostic: Diagnostic): string {
		return `${diagnostic.range.start.line}_${diagnostic.message}`;
	}

	onDiagnosticChange = (event: DiagnosticChangeEvent) => {
		if (!event.uris.length) {
			this.cachedDiagnostics = {};
			return;
		}
		for (const uri of event.uris) {
			this.updateCachedDiagnosticForUri(uri);
		}
	};

	updateCachedDiagnosticForUri = (uri: Uri) => {
		const stringUri = uri.toString();
		const diagnosticForUri = languages.getDiagnostics(uri);
		const cachedDiagnosticsForUri = this.cachedDiagnostics[stringUri];
		const transformed: CachedDiagnostic = {
			[stringUri]: {},
		};
		for (const diagnostic of diagnosticForUri) {
			if (transformed[stringUri]) {
				transformed[stringUri][this.convertDiagnosticToId(diagnostic)] = diagnostic;
			}
		}
		// If there's no uri saved - save it and render all diagnostics
		if (!cachedDiagnosticsForUri) {
			this.cachedDiagnostics[stringUri] = transformed[stringUri];
			this.updateDecorationsThrottled(uri);
		} else {
			const transformedDiagnosticForUri = transformed[stringUri];
			const cachedKeys = Object.keys(cachedDiagnosticsForUri);
			const transformedKeys = Object.keys(transformedDiagnosticForUri);

			for (const key of cachedKeys) {
				if (!transformedKeys.includes(key)) {
					// Fixed old problem => remove it fast => do throttle
					this.updateDecorationsThrottled(uri);
					return;
				}
			}

			for (const key of transformedKeys) {
				if (!cachedKeys.includes(key)) {
					// Created new problem => Use delay => do debounce
					this.updateDecorationsDebounced(uri);
					return;
				}
			}
		}
	};

	updateDecorations = (uri: Uri) => {
		const stringUri = uri.toString();
		const diagnostics = languages.getDiagnostics(uri);
		const groupedDiagnostics = groupDiagnosticsByLine(diagnostics);

		this.cachedDiagnostics[stringUri] = {};
		for (const diag of diagnostics) {
			this.cachedDiagnostics[stringUri][this.convertDiagnosticToId(diag)] = diag;
		}

		for (const editor of window.visibleTextEditors) {
			if (editor.document.uri.fsPath === uri.fsPath) {
				updateDecorationsForUri(uri, editor, groupedDiagnostics);
			}
		}
	};
}
