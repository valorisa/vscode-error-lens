import vscode, { window, workspace, commands } from 'vscode';
import throttle from 'lodash/throttle';

import type { IAggregatedByLineDiagnostics, IConfig, ISomeDiagnostics, IInnerDiag } from './types';
import { truncate } from './utils';
import { getGutterStyles } from './gutter';

export const EXTENSION_NAME = 'errorLens';
export let config: IConfig;
let isDelaySet = false;
let excludeRegexp: RegExp[] = [];

let errorLensEnabled = true;
let errorEnabled = true;
let warningEabled = true;
let infoEnabled = true;
let hintEnabled = true;
let configErrorEnabled = true;
let configWarningEnabled = true;
let configInfoEnabled = true;
let configHintEnabled = true;
let lastSavedTimestamp = Date.now() + 5000;

let decorationRenderOptionsError: vscode.DecorationRenderOptions;
let decorationRenderOptionsWarning: vscode.DecorationRenderOptions;
let decorationRenderOptionsInfo: vscode.DecorationRenderOptions;
let decorationRenderOptionsHint: vscode.DecorationRenderOptions;

let decorationTypeError: vscode.TextEditorDecorationType;
let decorationTypeWarning: vscode.TextEditorDecorationType;
let decorationTypeInfo: vscode.TextEditorDecorationType;
let decorationTypeHint: vscode.TextEditorDecorationType;

let onDidChangeDiagnosticsDisposable: vscode.Disposable | undefined;
let onDidChangeActiveTextEditor: vscode.Disposable | undefined;
let onDidChangeVisibleTextEditors: vscode.Disposable | undefined;
let onDidSaveTextDocumentDisposable: vscode.Disposable | undefined;
let onDidCursorChangeDisposable: vscode.Disposable | undefined;

let customDelay: undefined | CustomDelay;

class CustomDelay {
	private readonly delay: number;
	private cachedDiagnostics: ISomeDiagnostics = {};
	private readonly updateDecorationsThrottled: (stringUri: string)=> void;


	constructor(delay: number) {
		this.delay = delay;
		this.updateDecorationsThrottled = throttle(this.updateDecorations, 200, {
			leading: false,
			trailing: true,
		});
	}

	static convertDiagnosticToId(diagnostic: vscode.Diagnostic): string {
		return `${diagnostic.range.start.line}${diagnostic.message}`;
	}

	updateCachedDiagnosticForUri = (uri: vscode.Uri): void => {
		const stringUri = uri.toString();
		const diagnosticForUri = vscode.languages.getDiagnostics(uri);
		const cachedDiagnosticsForUri = this.cachedDiagnostics[stringUri];
		const transformed = {
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
			this.cachedDiagnostics = {};
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
			const transformed = {
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
				const decorationOptionsError: vscode.DecorationOptions[] = [];
				const decorationOptionsWarning: vscode.DecorationOptions[] = [];
				const decorationOptionsInfo: vscode.DecorationOptions[] = [];
				const decorationOptionsHint: vscode.DecorationOptions[] = [];

				const aggregatedDiagnostics = this.groupByLine(this.cachedDiagnostics[stringUri]);

				let allowedLineNumbersToRenderDiagnostics: number[] | undefined;
				if (config.followCursor === 'closestProblem') {
					const range = editor.selection;
					const line = range.start.line;

					const aggregatedDiagnosticsAsArray = Object.entries(aggregatedDiagnostics).sort((a, b) => Math.abs(line - Number(a[0])) - Math.abs(line - Number(b[0])));
					aggregatedDiagnosticsAsArray.length = config.followCursorMore + 1;// Reduce array length to the number of allowed rendered lines (decorations)
					allowedLineNumbersToRenderDiagnostics = aggregatedDiagnosticsAsArray.map(d => d[1][0].range.start.line);
				}

				for (const key in aggregatedDiagnostics) {
					const aggregatedDiagnostic = aggregatedDiagnostics[key].sort((a, b) => a.severity - b.severity);

					let addErrorLens = false;
					const diagnostic = aggregatedDiagnostic[0];
					const severity = diagnostic.severity;

					switch (severity) {
						case 0: addErrorLens = configErrorEnabled && errorEnabled; break;
						case 1: addErrorLens = configWarningEnabled && warningEabled; break;
						case 2: addErrorLens = configInfoEnabled && infoEnabled; break;
						case 3: addErrorLens = configHintEnabled && hintEnabled; break;
					}

					if (addErrorLens) {
						let messagePrefix = '';
						if (config.addAnnotationTextPrefixes) {
							messagePrefix += config.annotationPrefix[severity] || '';
						}

						let decorationRenderOptions: vscode.DecorationRenderOptions = {};
						switch (severity) {
							case 0: decorationRenderOptions = decorationRenderOptionsError; break;
							case 1: decorationRenderOptions = decorationRenderOptionsWarning; break;
							case 2: decorationRenderOptions = decorationRenderOptionsInfo; break;
							case 3: decorationRenderOptions = decorationRenderOptionsHint; break;
						}

						// Generate a DecorationInstanceRenderOptions object which specifies the text which will be rendered
						// after the source-code line in the editor
						const decInstanceRenderOptions: vscode.DecorationInstanceRenderOptions = {
							...decorationRenderOptions,
							after: {
								...decorationRenderOptions.after || {},
								contentText: truncate(messagePrefix + diagnostic.message),
							},
						};

						let messageRange: vscode.Range | undefined;
						if (config.followCursor === 'allLines') {
							// Default value (most used)
							messageRange = diagnostic.range;
						} else {
							// Others require cursor tracking
							// if (range === undefined) {
							const range = editor.selection;
							// }
							const diagnosticRange = diagnostic.range;

							if (config.followCursor === 'activeLine') {
								const lineStart = range.start.line - config.followCursorMore;
								const lineEnd = range.end.line + config.followCursorMore;

								if (diagnosticRange.start.line >= lineStart && diagnosticRange.start.line <= lineEnd ||
							diagnosticRange.end.line >= lineStart && diagnosticRange.end.line <= lineEnd) {
									messageRange = diagnosticRange;
								}
							} else if (config.followCursor === 'closestProblem') {
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								if (allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.start.line) || allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.end.line)) {
									messageRange = diagnosticRange;
								}
							}

							if (!messageRange) {
								continue;
							}
						}

						const diagnosticDecorationOptions: vscode.DecorationOptions = {
							range: messageRange,
							renderOptions: decInstanceRenderOptions,
						};

						switch (severity) {
							case 0: decorationOptionsError.push(diagnosticDecorationOptions); break;
							case 1: decorationOptionsWarning.push(diagnosticDecorationOptions); break;
							case 2: decorationOptionsInfo.push(diagnosticDecorationOptions); break;
							case 3: decorationOptionsHint.push(diagnosticDecorationOptions); break;
						}
					}
				}

				editor.setDecorations(decorationTypeError, decorationOptionsError);
				editor.setDecorations(decorationTypeWarning, decorationOptionsWarning);
				editor.setDecorations(decorationTypeInfo, decorationOptionsInfo);
				editor.setDecorations(decorationTypeHint, decorationOptionsHint);
			}
		}
	};

	groupByLine(diag: IInnerDiag): IAggregatedByLineDiagnostics {
		const aggregatedDiagnostics: IAggregatedByLineDiagnostics = Object.create(null);

		nextDiagnostic:
		for (const lineNumberKey in diag) {
			const diagnostic = diag[lineNumberKey];
			for (const regex of excludeRegexp) {
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

export function activate(extensionContext: vscode.ExtensionContext): void {
	updateConfig();
	// ────────────────────────────────────────────────────────────────────────────────
	// ──── Event Listeners ───────────────────────────────────────────────────────────
	// ────────────────────────────────────────────────────────────────────────────────
	function updateChangedActiveTextEditorListener(): void {
		if (onDidChangeActiveTextEditor) {
			onDidChangeActiveTextEditor.dispose();
		}
		onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor(textEditor => {
			if (textEditor) {
				updateDecorationsForUri(textEditor.document.uri, textEditor);
			}
		});
	}
	function updateChangeVisibleTextEditorsListener(): void {
		if (onDidChangeVisibleTextEditors) {
			onDidChangeVisibleTextEditors.dispose();
		}
		onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(updateAllDecorations);
	}
	function updateChangeDiagnosticListener(): void {
		if (onDidChangeDiagnosticsDisposable) {
			onDidChangeDiagnosticsDisposable.dispose();
		}
		function onChangedDiagnostics(diagnosticChangeEvent: vscode.DiagnosticChangeEvent): void {
			// Many URIs can change - we only need to decorate all visible editors
			for (const uri of diagnosticChangeEvent.uris) {
				for (const editor of window.visibleTextEditors) {
					if (uri.fsPath === editor.document.uri.fsPath) {
						updateDecorationsForUri(uri, editor);
					}
				}
			}
		}
		isDelaySet = false;
		if (config.onSave) {
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(e => {
				if (Date.now() - lastSavedTimestamp < 1000) {
					onChangedDiagnostics(e);
				}
			});
			return;
		}
		if (typeof config.delay === 'number' && config.delay > 0) {
			isDelaySet = true;
			customDelay = new CustomDelay(config.delay);
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(customDelay.onDiagnosticChange);
		} else {
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(onChangedDiagnostics);
		}
	}
	function updateCursorChangeListener(): void {
		if (onDidCursorChangeDisposable) {
			onDidCursorChangeDisposable.dispose();
		}
		if (config.followCursor === 'allLines') {
			return;
		}
		if (config.followCursor === 'activeLine' || config.followCursor === 'closestProblem') {
			let lastPositionLine = 999999;// Unlikely line number
			onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(e => {
				const selection = e.selections[0];
				if (e.selections.length === 1 &&
					selection.isEmpty &&
					lastPositionLine !== selection.active.line) {
					updateDecorationsForUri(e.textEditor.document.uri, e.textEditor, selection);
					lastPositionLine = e.selections[0].active.line;
				}
			});
		}
	}
	function updateOnSaveListener(): void {
		if (onDidSaveTextDocumentDisposable) {
			onDidSaveTextDocumentDisposable.dispose();
		}
		if (!config.onSave) {
			return;
		}
		onDidSaveTextDocumentDisposable = workspace.onDidSaveTextDocument(e => {
			lastSavedTimestamp = Date.now();
			setTimeout(() => {
				updateDecorationsForUri(e.uri);
			}, 600);
		});
	}
	// ────────────────────────────────────────────────────────────────────────────────
	//
	// ────────────────────────────────────────────────────────────────────────────────

	function updateDecorationsForUri(uriToDecorate: vscode.Uri, editor?: vscode.TextEditor, range?: vscode.Range): void {
		if (editor === undefined) {
			editor = window.activeTextEditor;
		}
		if (!editor) {
			return;
		}

		if (!editor.document.uri.fsPath) {
			return;
		}

		const decorationOptionsError: vscode.DecorationOptions[] = [];
		const decorationOptionsWarning: vscode.DecorationOptions[] = [];
		const decorationOptionsInfo: vscode.DecorationOptions[] = [];
		const decorationOptionsHint: vscode.DecorationOptions[] = [];

		const aggregatedDiagnostics = getDiagnosticAndGroupByLine(uriToDecorate);

		let allowedLineNumbersToRenderDiagnostics: number[] | undefined;
		if (config.followCursor === 'closestProblem') {
			if (range === undefined) {
				range = editor.selection;
			}
			const line = range.start.line;

			const aggregatedDiagnosticsAsArray = Object.entries(aggregatedDiagnostics).sort((a, b) => Math.abs(line - Number(a[0])) - Math.abs(line - Number(b[0])));
			aggregatedDiagnosticsAsArray.length = config.followCursorMore + 1;// Reduce array length to the number of allowed rendered lines (decorations)
			allowedLineNumbersToRenderDiagnostics = aggregatedDiagnosticsAsArray.map(d => d[1][0].range.start.line);
		}

		for (const key in aggregatedDiagnostics) {
			const aggregatedDiagnostic = aggregatedDiagnostics[key].sort((a, b) => a.severity - b.severity);

			let addErrorLens = false;
			const diagnostic = aggregatedDiagnostic[0];
			const severity = diagnostic.severity;

			switch (severity) {
				case 0: addErrorLens = configErrorEnabled && errorEnabled; break;
				case 1: addErrorLens = configWarningEnabled && warningEabled; break;
				case 2: addErrorLens = configInfoEnabled && infoEnabled; break;
				case 3: addErrorLens = configHintEnabled && hintEnabled; break;
			}

			if (addErrorLens) {
				let messagePrefix = '';
				if (config.addAnnotationTextPrefixes) {
					messagePrefix += config.annotationPrefix[severity] || '';
				}

				let decorationRenderOptions: vscode.DecorationRenderOptions = {};
				switch (severity) {
					case 0: decorationRenderOptions = decorationRenderOptionsError; break;
					case 1: decorationRenderOptions = decorationRenderOptionsWarning; break;
					case 2: decorationRenderOptions = decorationRenderOptionsInfo; break;
					case 3: decorationRenderOptions = decorationRenderOptionsHint; break;
				}

				// Generate a DecorationInstanceRenderOptions object which specifies the text which will be rendered
				// after the source-code line in the editor
				const decInstanceRenderOptions: vscode.DecorationInstanceRenderOptions = {
					...decorationRenderOptions,
					after: {
						...decorationRenderOptions.after || {},
						contentText: truncate(messagePrefix + diagnostic.message),
					},
				};

				let messageRange: vscode.Range | undefined;
				if (config.followCursor === 'allLines') {
					// Default value (most used)
					messageRange = diagnostic.range;
				} else {
					// Others require cursor tracking
					if (range === undefined) {
						range = editor.selection;
					}
					const diagnosticRange = diagnostic.range;

					if (config.followCursor === 'activeLine') {
						const lineStart = range.start.line - config.followCursorMore;
						const lineEnd = range.end.line + config.followCursorMore;

						if (diagnosticRange.start.line >= lineStart && diagnosticRange.start.line <= lineEnd ||
							diagnosticRange.end.line >= lineStart && diagnosticRange.end.line <= lineEnd) {
							messageRange = diagnosticRange;
						}
					} else if (config.followCursor === 'closestProblem') {
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						if (allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.start.line) || allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.end.line)) {
							messageRange = diagnosticRange;
						}
					}

					if (!messageRange) {
						continue;
					}
				}

				const diagnosticDecorationOptions: vscode.DecorationOptions = {
					range: messageRange,
					renderOptions: decInstanceRenderOptions,
				};

				switch (severity) {
					case 0: decorationOptionsError.push(diagnosticDecorationOptions); break;
					case 1: decorationOptionsWarning.push(diagnosticDecorationOptions); break;
					case 2: decorationOptionsInfo.push(diagnosticDecorationOptions); break;
					case 3: decorationOptionsHint.push(diagnosticDecorationOptions); break;
				}
			}
		}

		editor.setDecorations(decorationTypeError, decorationOptionsError);
		editor.setDecorations(decorationTypeWarning, decorationOptionsWarning);
		editor.setDecorations(decorationTypeInfo, decorationOptionsInfo);
		editor.setDecorations(decorationTypeHint, decorationOptionsHint);
	}

	function onConfigChange(e: vscode.ConfigurationChangeEvent): void {
		if (!e.affectsConfiguration(EXTENSION_NAME)) return;
		updateConfig();
	}

	function updateConfig(): void {
		config = workspace.getConfiguration(EXTENSION_NAME) as any as IConfig;
		/* develblock:start */
		config = JSON.parse(JSON.stringify(workspace.getConfiguration(EXTENSION_NAME))) as IConfig;
		/* develblock:end */

		disposeEverything();
		updateEverything();
	}

	function updateExclude(): void {
		excludeRegexp = [];

		for (const item of config.exclude) {
			if (typeof item === 'string') {
				excludeRegexp.push(new RegExp(item, 'i'));
			}
		}
	}

	function updateConfigEnabledLevels(): void {
		configErrorEnabled = config.enabledDiagnosticLevels.includes('error');
		configWarningEnabled = config.enabledDiagnosticLevels.includes('warning');
		configInfoEnabled = config.enabledDiagnosticLevels.includes('info');
		configHintEnabled = config.enabledDiagnosticLevels.includes('hint');
	}

	function setDecorationStyle(): void {
		let gutter;
		if (config.gutterIconsEnabled) {
			gutter = getGutterStyles(extensionContext);
		}

		const errorBackground = new vscode.ThemeColor('errorLens.errorBackground');
		const errorBackgroundLight = new vscode.ThemeColor('errorLens.errorBackgroundLight');
		const errorForeground = new vscode.ThemeColor('errorLens.errorForeground');
		const errorForegroundLight = new vscode.ThemeColor('errorLens.errorForegroundLight');
		const errorMessageBackground = new vscode.ThemeColor('errorLens.errorMessageBackground');

		const warningBackground = new vscode.ThemeColor('errorLens.warningBackground');
		const warningBackgroundLight = new vscode.ThemeColor('errorLens.warningBackgroundLight');
		const warningForeground = new vscode.ThemeColor('errorLens.warningForeground');
		const warningForegroundLight = new vscode.ThemeColor('errorLens.warningForegroundLight');
		const warningMessageBackground = new vscode.ThemeColor('errorLens.warningMessageBackground');

		const infoBackground = new vscode.ThemeColor('errorLens.infoBackground');
		const infoBackgroundLight = new vscode.ThemeColor('errorLens.infoBackgroundLight');
		const infoForeground = new vscode.ThemeColor('errorLens.infoForeground');
		const infoForegroundLight = new vscode.ThemeColor('errorLens.infoForegroundLight');
		const infoMessageBackground = new vscode.ThemeColor('errorLens.infoMessageBackground');

		const hintBackground = new vscode.ThemeColor('errorLens.hintBackground');
		const hintBackgroundLight = new vscode.ThemeColor('errorLens.hintBackgroundLight');
		const hintForeground = new vscode.ThemeColor('errorLens.hintForeground');
		const hintForegroundLight = new vscode.ThemeColor('errorLens.hintForegroundLight');
		const hintMessageBackground = new vscode.ThemeColor('errorLens.hintMessageBackground');

		const onlyDigitsRegExp = /^\d+$/;
		const fontFamily = config.fontFamily ? `font-family:${config.fontFamily}` : '';
		const fontSize = config.fontSize ? `font-size:${onlyDigitsRegExp.test(config.fontSize) ? `${config.fontSize}px` : config.fontSize};line-height:1` : '';
		const padding = config.padding ? `padding:${onlyDigitsRegExp.test(config.padding) ? `${config.padding}px` : config.padding}` : '';

		const afterProps: vscode.ThemableDecorationAttachmentRenderOptions = {
			fontStyle: config.fontStyleItalic ? 'italic' : 'normal',
			fontWeight: config.fontWeight,
			textDecoration: `;${fontFamily};${fontSize};${padding};margin-left:${onlyDigitsRegExp.test(config.margin) ? `${config.margin}px` : config.margin};border-radius:3px;`,
		};

		decorationRenderOptionsError = {
			backgroundColor: errorBackground,
			gutterIconSize: config.gutterIconSize,
			gutterIconPath: gutter?.errorIconPath,
			after: {
				...afterProps,
				color: errorForeground,
				backgroundColor: errorMessageBackground,
			},
			light: {
				backgroundColor: errorBackgroundLight,
				gutterIconSize: config.gutterIconSize,
				gutterIconPath: gutter?.errorIconPathLight,
				after: {
					color: errorForegroundLight,
				},
			},
			isWholeLine: true,
		};
		decorationRenderOptionsWarning = {
			backgroundColor: warningBackground,
			gutterIconSize: config.gutterIconSize,
			gutterIconPath: gutter?.warningIconPath,
			after: {
				...afterProps,
				color: warningForeground,
				backgroundColor: warningMessageBackground,
			},
			light: {
				backgroundColor: warningBackgroundLight,
				gutterIconSize: config.gutterIconSize,
				gutterIconPath: gutter?.warningIconPathLight,
				after: {
					color: warningForegroundLight,
				},
			},
			isWholeLine: true,
		};
		decorationRenderOptionsInfo = {
			backgroundColor: infoBackground,
			gutterIconSize: config.gutterIconSize,
			gutterIconPath: gutter?.infoIconPath,
			after: {
				...afterProps,
				color: infoForeground,
				backgroundColor: infoMessageBackground,
			},
			light: {
				backgroundColor: infoBackgroundLight,
				gutterIconSize: config.gutterIconSize,
				gutterIconPath: gutter?.infoIconPathLight,
				after: {
					color: infoForegroundLight,
				},
			},
			isWholeLine: true,
		};
		decorationRenderOptionsHint = {
			backgroundColor: hintBackground,
			after: {
				...afterProps,
				color: hintForeground,
				backgroundColor: hintMessageBackground,
			},
			light: {
				backgroundColor: hintBackgroundLight,
				after: {
					color: hintForegroundLight,
				},
			},
			isWholeLine: true,
		};

		decorationTypeError = window.createTextEditorDecorationType(decorationRenderOptionsError);
		decorationTypeWarning = window.createTextEditorDecorationType(decorationRenderOptionsWarning);
		decorationTypeInfo = window.createTextEditorDecorationType(decorationRenderOptionsInfo);
		decorationTypeHint = window.createTextEditorDecorationType(decorationRenderOptionsHint);
	}

	function updateEverything(): void {
		updateExclude();
		// 👩‍💻 Only when developing extension: ================================================
		// Show gutter icons
		// Ignore `exclude` setting
		/* develblock:start */
		excludeRegexp = [];
		config.gutterIconsEnabled = true;
		/* develblock:end */
		// 👩‍💻 ================================================================================
		setDecorationStyle();
		updateConfigEnabledLevels();

		updateAllDecorations();

		updateChangeDiagnosticListener();
		updateChangeVisibleTextEditorsListener();
		updateOnSaveListener();
		updateCursorChangeListener();
		updateChangedActiveTextEditorListener();
	}

	function disposeEverything(): void {
		if (decorationTypeError) {
			decorationTypeError.dispose();
		}
		if (decorationTypeWarning) {
			decorationTypeWarning.dispose();
		}
		if (decorationTypeInfo) {
			decorationTypeInfo.dispose();
		}
		if (decorationTypeHint) {
			decorationTypeHint.dispose();
		}
		if (onDidChangeVisibleTextEditors) {
			onDidChangeVisibleTextEditors.dispose();
		}
		if (onDidChangeDiagnosticsDisposable) {
			onDidChangeDiagnosticsDisposable.dispose();
		}
		if (onDidChangeActiveTextEditor) {
			onDidChangeActiveTextEditor.dispose();
		}
		if (onDidSaveTextDocumentDisposable) {
			onDidSaveTextDocumentDisposable.dispose();
		}
		if (onDidCursorChangeDisposable) {
			onDidCursorChangeDisposable.dispose();
		}
	}

	function updateAllDecorations(): void {
		for (const editor of window.visibleTextEditors) {
			updateDecorationsForUri(editor.document.uri, editor);
		}
	}
	// ────────────────────────────────────────────────────────────────────────────────
	// ──── Commands ──────────────────────────────────────────────────────────────────
	// ────────────────────────────────────────────────────────────────────────────────
	const disposableToggleErrorLens = commands.registerCommand(`${EXTENSION_NAME}.toggle`, () => {
		errorLensEnabled = !errorLensEnabled;

		if (errorLensEnabled) {
			updateEverything();
		} else {
			disposeEverything();
		}
	});
	const disposableToggleError = commands.registerCommand(`${EXTENSION_NAME}.toggleError`, () => {
		errorEnabled = !errorEnabled;
		updateAllDecorations();
	});
	const disposableToggleWarning = commands.registerCommand(`${EXTENSION_NAME}.toggleWarning`, () => {
		warningEabled = !warningEabled;
		updateAllDecorations();
	});
	const disposableToggleInfo = commands.registerCommand(`${EXTENSION_NAME}.toggleInfo`, () => {
		infoEnabled = !infoEnabled;
		updateAllDecorations();
	});
	const disposableToggleHint = commands.registerCommand(`${EXTENSION_NAME}.toggleHint`, () => {
		hintEnabled = !hintEnabled;
		updateAllDecorations();
	});

	const disposableCopyProblemMessage = commands.registerTextEditorCommand(`${EXTENSION_NAME}.copyProblemMessage`, editor => {
		const aggregatedDiagnostics: IAggregatedByLineDiagnostics = {};
		for (const diagnostic of vscode.languages.getDiagnostics(editor.document.uri)) {
			const key = diagnostic.range.start.line;

			if (aggregatedDiagnostics[key]) {
				aggregatedDiagnostics[key].push(diagnostic);
			} else {
				aggregatedDiagnostics[key] = [diagnostic];
			}
		}
		const activeLineNumber = editor.selection.active.line;
		const diagnosticAtActiveLineNumber = aggregatedDiagnostics[activeLineNumber];
		if (!diagnosticAtActiveLineNumber) {
			window.showInformationMessage('There\'s no problem at the active line.');
			return;
		}
		const renderedDiagnostic = diagnosticAtActiveLineNumber.sort((a, b) => a.severity - b.severity)[0];
		const source = renderedDiagnostic.source ? `[${renderedDiagnostic.source}] ` : '';
		vscode.env.clipboard.writeText(source + renderedDiagnostic.message);
	});

	extensionContext.subscriptions.push(workspace.onDidChangeConfiguration(onConfigChange));
	extensionContext.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage);
}

// #region
// The aggregatedDiagnostics object will contain one or more objects, each object being keyed by "N",
// where N is the source line where one or more diagnostics are being reported.
// Each object which is keyed by "N" will contain one or more arrayDiagnostics[] array of objects.
// This facilitates gathering info about lines which contain more than one diagnostic.
// {
//     67: [
//         <vscode.Diagnostic #1>,
//         <vscode.Diagnostic #2>
//     ],
//     93: [
//         <vscode.Diagnostic #1>
//     ]
// };
// #endregion
function getDiagnosticAndGroupByLine(uri: vscode.Uri): IAggregatedByLineDiagnostics {
	const aggregatedDiagnostics: IAggregatedByLineDiagnostics = Object.create(null);
	const diagnostics = vscode.languages.getDiagnostics(uri);

	nextDiagnostic:
	for (const diagnostic of diagnostics) {
		// Exclude items specified in `errorLens.exclude` setting
		for (const regex of excludeRegexp) {
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

export function deactivate(): void { }
