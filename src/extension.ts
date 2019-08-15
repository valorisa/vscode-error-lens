import debounce from 'lodash/debounce';
import * as vscode from 'vscode';
import { window, workspace } from 'vscode';

import { IAggregatedDiagnostics, IConfig, IExcludeObject } from './types';
import { isObject, truncate } from './utils';

export function activate(context: vscode.ExtensionContext) {
	const EXTNAME = 'errorLens';
	let config = workspace.getConfiguration(EXTNAME) as any as IConfig;
	let excludeRegexp: RegExp[] = [];
	let excludeSourceAndCode: IExcludeObject[] = [];
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

	let decorationTypeError: vscode.TextEditorDecorationType;
	let decorationTypeWarning: vscode.TextEditorDecorationType;
	let decorationTypeInfo: vscode.TextEditorDecorationType;
	let decorationTypeHint: vscode.TextEditorDecorationType;

	let onDidChangeDiagnosticsDisposable: vscode.Disposable;
	let onDidSaveTextDocumentDisposable: vscode.Disposable;
	let onDidCursorChangeDisposable: vscode.Disposable;
	let lastPosition: vscode.Position;

	updateEverything();

	window.onDidChangeActiveTextEditor(textEditor => {
		if (textEditor) {
			updateDecorationsForUri(textEditor.document.uri, textEditor);
		}
	}, undefined, context.subscriptions);

	function onChangedDiagnostics(diagnosticChangeEvent: vscode.DiagnosticChangeEvent) {
		// Many URIs can change - we only need to decorate all visible editors
		for (const uri of diagnosticChangeEvent.uris) {
			for (const editor of window.visibleTextEditors) {
				if (uri.fsPath === editor.document.uri.fsPath) {
					updateDecorationsForUri(uri, editor);
				}
			}
		}
	}

	function updateChangeDiagnosticListener() {
		if (onDidChangeDiagnosticsDisposable) {
			onDidChangeDiagnosticsDisposable.dispose();
		}
		if (config.onSave) {
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(e => {
				if ((Date.now() - lastSavedTimestamp) < 1000) {
					onChangedDiagnostics(e);
				}
			});
			return;
		}
		if (typeof config.delay === 'number' && config.delay > 0) {
			const debouncedOnChangeDiagnostics = debounce(onChangedDiagnostics, config.delay);
			const onChangedDiagnosticsDebounced = (diagnosticChangeEvent: vscode.DiagnosticChangeEvent) => {
				if (config.clearDecorations) {
					clearAllDecorations();
				}
				debouncedOnChangeDiagnostics(diagnosticChangeEvent);
			};
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(onChangedDiagnosticsDebounced);
		} else {
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(onChangedDiagnostics);
		}
	}
	function updateCursorChangeListener() {
		if (onDidCursorChangeDisposable) {
			onDidCursorChangeDisposable.dispose();
		}
		if (config.followCursor === 'allLines') {
			return;
		}
		if (config.followCursor === 'activeLine' || config.followCursor === 'closestProblem') {
			lastPosition = new vscode.Position(999999, 0);// Unlikely line number
			onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(e => {
				const selection = e.selections[0];
				if (e.selections.length === 1 &&
					selection.isEmpty &&
					lastPosition.line !== selection.active.line) {
					updateDecorationsForUri(e.textEditor.document.uri, e.textEditor, selection);
					lastPosition = e.selections[0].active;
				}
			});
		}
	}
	function updateOnSaveListener() {
		if (onDidSaveTextDocumentDisposable) {
			onDidSaveTextDocumentDisposable.dispose();
		}
		if (!config.onSave) {
			return;
		}
		onDidSaveTextDocumentDisposable = workspace.onDidSaveTextDocument(onSaveDocument);
	}
	function onSaveDocument(e: vscode.TextDocument) {
		lastSavedTimestamp = Date.now();
		setTimeout(() => {
			updateDecorationsForUri(e.uri);
		}, 600);
	}

	/**
     * Update the editor decorations for the provided URI. Only if the URI scheme is "file" is the function
     * processed. (It can be others, such as "git://<something>", in which case the function early-exits).
     */
	function updateDecorationsForUri(uriToDecorate : vscode.Uri, editor?: vscode.TextEditor, range?: vscode.Range) {
		if (!uriToDecorate) {
			return;
		}

		if ((uriToDecorate.scheme !== 'file') && (uriToDecorate.scheme !== 'untitled') && (uriToDecorate.scheme !== 'vscode-userdata')) {
			return;
		}

		const activeTextEditor = window.activeTextEditor;
		if (editor === undefined) {
			editor = activeTextEditor;// tslint:disable-line
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

		if (errorLensEnabled) {
			const aggregatedDiagnostics: IAggregatedDiagnostics = {};
			// Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
			// a list of objects, grouping together diagnostics which occur on a single line.
			nextDiagnostic:
			for (const diagnostic of vscode.languages.getDiagnostics(uriToDecorate)) {
				// Exclude items specified in `errorLens.exclude` setting
				for (const regex of excludeRegexp) {
					if (regex.test(diagnostic.message)) {
						continue nextDiagnostic;
					}
				}
				for (const excludeItem of excludeSourceAndCode) {
					if (diagnostic.source === excludeItem.source &&
						String(diagnostic.code) === excludeItem.code) {
						continue nextDiagnostic;
					}
				}

				const key = diagnostic.range.start.line;

				if (aggregatedDiagnostics[key]) {
					// Already added an object for this key, so augment the arrayDiagnostics[] array.
					aggregatedDiagnostics[key].push(diagnostic);
				} else {
					// Create a new object for this key, specifying the line: and a arrayDiagnostics[] array
					aggregatedDiagnostics[key] = [diagnostic];
				}
			}

			let allowedLineNumbersToRenderDiagnostics: number[] | undefined;
			if (config.followCursor === 'closestProblem') {
				if (range === undefined) {
					range = editor.selection;// tslint:disable-line
				}
				const line = range.start.line;

				const aggregatedDiagnosticsAsArray = Object.entries(aggregatedDiagnostics).sort((a, b) => {
					return Math.abs(line - Number(a[0])) - Math.abs(line - Number(b[0]));
				});
				aggregatedDiagnosticsAsArray.length = config.followCursorMore + 1;// Reduce array length to the number of allowed rendered lines (decorations)
				allowedLineNumbersToRenderDiagnostics = aggregatedDiagnosticsAsArray.map(d => d[1][0].range.start.line);
			}

			for (const key in aggregatedDiagnostics) {
				const aggregatedDiagnostic = aggregatedDiagnostics[key].sort((a, b) => a.severity - b.severity);

				let addErrorLens = false;
				switch (aggregatedDiagnostic[0].severity) {
					// Error
					case 0:
						if (configErrorEnabled && errorEnabled) {
							addErrorLens = true;
						}
						break;
					// Warning
					case 1:
						if (configWarningEnabled && warningEabled) {
							addErrorLens = true;
						}
						break;
					// Info
					case 2:
						if (configInfoEnabled && infoEnabled) {
							addErrorLens = true;
						}
						break;
					// Hint
					case 3:
						if (configHintEnabled && hintEnabled) {
							addErrorLens = true;
						}
						break;
				}

				if (addErrorLens) {
					let messagePrefix = '';
					if (config.addAnnotationTextPrefixes) {
						if (aggregatedDiagnostic.length > 1) {
							// If > 1 diagnostic for this source line, the prefix is "Diagnostic #1 of N: "
							messagePrefix += 'Diagnostic 1/' + String(aggregatedDiagnostic.length) + ': ';
						} else {
							// If only 1 diagnostic for this source line, show the diagnostic severity
							switch (aggregatedDiagnostic[0].severity) {
								case 0:
									messagePrefix += 'ERROR: ';
									break;

								case 1:
									messagePrefix += 'WARNING: ';
									break;

								case 2:
									messagePrefix += 'INFO: ';
									break;

								case 3:
								default:
									messagePrefix += 'HINT: ';
									break;
							}
						}
					}
					// Generate a DecorationInstanceRenderOptions object which specifies the text which will be rendered
					// after the source-code line in the editor
					const decInstanceRenderOptions: vscode.DecorationInstanceRenderOptions = {
						after: {
							contentText: truncate(messagePrefix + aggregatedDiagnostic[0].message),
						},
					};

					let messageRange: vscode.Range | undefined;
					if (config.followCursor === 'allLines') {
						// Default value (most used)
						messageRange = aggregatedDiagnostic[0].range;
					} else {
						// Others require cursor tracking
						if (range === undefined) {
							range = editor.selection;// tslint:disable-line
						}
						const diagnosticRange = aggregatedDiagnostic[0].range;

						if (config.followCursor === 'activeLine') {
							const lineStart = range.start.line - config.followCursorMore;
							const lineEnd = range.end.line + config.followCursorMore;

							if (((diagnosticRange.start.line >= lineStart) && (diagnosticRange.start.line <= lineEnd)) ||
								((diagnosticRange.end.line >= lineStart) && (diagnosticRange.end.line <= lineEnd))) {
								messageRange = diagnosticRange;
							}
						} else if (config.followCursor === 'closestProblem') {
							if (allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.start.line) ||
								allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.end.line)) {
									messageRange = diagnosticRange;
							}
						}
					}

					if (!messageRange) {
						continue;
					}

					const diagnosticDecorationOptions: vscode.DecorationOptions = {
						range: messageRange,
						renderOptions: decInstanceRenderOptions,
					};

					switch (aggregatedDiagnostic[0].severity) {
						// Error
						case 0:
							decorationOptionsError.push(diagnosticDecorationOptions);
							break;
						// Warning
						case 1:
							decorationOptionsWarning.push(diagnosticDecorationOptions);
							break;
						// Info
						case 2:
							decorationOptionsInfo.push(diagnosticDecorationOptions);
							break;
						// Hint
						case 3:
							decorationOptionsHint.push(diagnosticDecorationOptions);
							break;
					}
				}
			}
		}

		// The errorLensDecorationOptions<X> arrays have been built, now apply them.
		editor.setDecorations(decorationTypeError, decorationOptionsError);
		editor.setDecorations(decorationTypeWarning, decorationOptionsWarning);
		editor.setDecorations(decorationTypeInfo, decorationOptionsInfo);
		editor.setDecorations(decorationTypeHint, decorationOptionsHint);
	}

	function clearAllDecorations() {
		for (const editor of window.visibleTextEditors) {
			editor.setDecorations(decorationTypeError, []);
			editor.setDecorations(decorationTypeWarning, []);
			editor.setDecorations(decorationTypeInfo, []);
			editor.setDecorations(decorationTypeHint, []);
		}
	}

	function updateConfig(e: vscode.ConfigurationChangeEvent) {
		if (!e.affectsConfiguration(EXTNAME)) return;

		config = workspace.getConfiguration(EXTNAME) as any as IConfig;

		decorationTypeError.dispose();
		decorationTypeWarning.dispose();
		decorationTypeInfo.dispose();
		decorationTypeHint.dispose();

		updateEverything();
		updateAllDecorations();
	}

	function updateExclude() {
		excludeRegexp = [];
		excludeSourceAndCode = [];

		for (const item of config.exclude) {
			if (typeof item === 'string') {
				excludeRegexp.push(new RegExp(item, 'i'));
			} else if (isObject(item)) {
				excludeSourceAndCode.push(item);
			}
		}
	}

	function updateConfigEnabledLevels() {
		configErrorEnabled = config.enabledDiagnosticLevels.indexOf('error') !== -1;
		configWarningEnabled = config.enabledDiagnosticLevels.indexOf('warning') !== -1;
		configInfoEnabled = config.enabledDiagnosticLevels.indexOf('info') !== -1;
		configHintEnabled = config.enabledDiagnosticLevels.indexOf('hint') !== -1;
	}

	function setDecorationStyle() {
		const gutterIconSize = config.gutterIconSize;

		let gutterIconSet = config.gutterIconSet;
		if (config.gutterIconSet !== 'borderless' &&
			config.gutterIconSet !== 'default' &&
			config.gutterIconSet !== 'circle') {
				gutterIconSet = 'default';
		}

		let errorGutterIconPath;
		let errorGutterIconPathLight;
		let warningGutterIconPath;
		let warningGutterIconPathLight;
		let infoGutterIconPath;
		let infoGutterIconPathLight;

		let errorGutterIconSizeAndColor = gutterIconSize;
		let errorGutterIconSizeAndColorLight = gutterIconSize;
		let warningGutterIconSizeAndColor = gutterIconSize;
		let warningGutterIconSizeAndColorLight = gutterIconSize;
		let infoGutterIconSizeAndColor = gutterIconSize;
		let infoGutterIconSizeAndColorLight = gutterIconSize;

		if (config.gutterIconsEnabled) {
			if (gutterIconSet === 'circle') {
				if (!config.errorGutterIconPath) {
					errorGutterIconSizeAndColor = getGutterCircleSizeAndColor(config.errorGutterIconColor);
				}
				if (!config.light.errorGutterIconPath) {
					errorGutterIconSizeAndColorLight = config.light.errorGutterIconColor ? getGutterCircleSizeAndColor(config.light.errorGutterIconColor) : errorGutterIconSizeAndColor;
				}
				if (!config.warningGutterIconPath) {
					warningGutterIconSizeAndColor = getGutterCircleSizeAndColor(config.warningGutterIconColor);
				}
				if (!config.light.warningGutterIconPath) {
					warningGutterIconSizeAndColorLight = config.light.warningGutterIconColor ? getGutterCircleSizeAndColor(config.light.warningGutterIconColor) : warningGutterIconSizeAndColor;
				}
				if (!config.infoGutterIconPath) {
					infoGutterIconSizeAndColor = getGutterCircleSizeAndColor(config.infoGutterIconColor);
				}
				if (!config.light.infoGutterIconPath) {
					infoGutterIconSizeAndColorLight = config.light.infoGutterIconColor ? getGutterCircleSizeAndColor(config.light.infoGutterIconColor) : infoGutterIconSizeAndColor;
				}
			}

			errorGutterIconPath = config.errorGutterIconPath || context.asAbsolutePath(`./img/${gutterIconSet}/error-inverse.svg`);
			errorGutterIconPathLight = config.light.errorGutterIconPath || (config.errorGutterIconPath ? config.errorGutterIconPath : false) || context.asAbsolutePath(`./img/${gutterIconSet}/error.svg`);
			warningGutterIconPath = config.warningGutterIconPath || context.asAbsolutePath(`./img/${gutterIconSet}/warning-inverse.svg`);
			warningGutterIconPathLight = config.light.warningGutterIconPath || (config.warningGutterIconPath ? config.warningGutterIconPath : false) || context.asAbsolutePath(`./img/${gutterIconSet}/warning.svg`);
			infoGutterIconPath = config.infoGutterIconPath || context.asAbsolutePath(`./img/${gutterIconSet}/info-inverse.svg`);
			infoGutterIconPathLight = config.light.infoGutterIconPath || (config.infoGutterIconPath ? config.infoGutterIconPath : false) || context.asAbsolutePath(`./img/${gutterIconSet}/info.svg`);
		}

		const afterProps = {
			fontStyle: config.fontStyleItalic ? 'italic' : 'normal',
			margin: config.margin,
			fontWeight: config.fontWeight,
			textDecoration: `;font-family:${config.fontFamily};font-size:${config.fontSize};line-height:1;`,
		};

		decorationTypeError = window.createTextEditorDecorationType({
			backgroundColor: config.errorBackground,
			gutterIconSize: errorGutterIconSizeAndColor,
			gutterIconPath: errorGutterIconPath,
			after: {
				...afterProps,
				color: config.errorForeground,
			},
			light: {
				backgroundColor: config.light.errorBackground || config.errorBackground,
				gutterIconSize: errorGutterIconSizeAndColorLight,
				gutterIconPath: errorGutterIconPathLight,
				after: {
					color: config.light.errorForeground || config.errorForeground,
				},
			},
			isWholeLine: true,
		});
		decorationTypeWarning = window.createTextEditorDecorationType({
			backgroundColor: config.warningBackground,
			gutterIconSize: warningGutterIconSizeAndColor,
			gutterIconPath: warningGutterIconPath,
			after: {
				...afterProps,
				color: config.warningForeground,
			},
			light: {
				backgroundColor: config.light.warningBackground || config.warningBackground,
				gutterIconSize: warningGutterIconSizeAndColorLight,
				gutterIconPath: warningGutterIconPathLight,
				after: {
					color: config.light.warningForeground || config.warningForeground,
				},
			},
			isWholeLine: true,
		});
		decorationTypeInfo = window.createTextEditorDecorationType({
			backgroundColor: config.infoBackground,
			gutterIconSize: infoGutterIconSizeAndColor,
			gutterIconPath: infoGutterIconPath,
			after: {
				...afterProps,
				color: config.infoForeground,
			},
			light: {
				backgroundColor: config.light.infoBackground || config.infoBackground,
				gutterIconSize: infoGutterIconSizeAndColorLight,
				gutterIconPath: infoGutterIconPathLight,
				after: {
					color: config.light.infoForeground || config.infoForeground,
				},
			},
			isWholeLine: true,
		});
		decorationTypeHint = window.createTextEditorDecorationType({
			backgroundColor: config.hintBackground,
			after: {
				...afterProps,
				color: config.hintForeground,
			},
			light: {
				backgroundColor: config.light.hintBackground || config.hintBackground,
				after: {
					color: config.light.hintForeground || config.hintForeground,
				},
			},
			isWholeLine: true,
		});
	}

	function updateEverything() {
		updateExclude();
		setDecorationStyle();
		updateConfigEnabledLevels();
		updateChangeDiagnosticListener();
		updateOnSaveListener();
		updateCursorChangeListener();
	}

	function updateAllDecorations() {
		for (const editor of window.visibleTextEditors) {
			updateDecorationsForUri(editor.document.uri, editor);
		}
	}
	function getGutterCircleSizeAndColor(color: string): string {
		return `${config.gutterIconSize};background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${color}"/></svg>');`;
	}

	const disposableToggleErrorLens = vscode.commands.registerCommand(`${EXTNAME}.toggle`, () => {
		errorLensEnabled = !errorLensEnabled;
		updateAllDecorations();
	});
	const disposableToggleError = vscode.commands.registerCommand(`${EXTNAME}.toggleError`, () => {
		errorEnabled = !errorEnabled;
		updateAllDecorations();
	});
	const disposableToggleWarning = vscode.commands.registerCommand(`${EXTNAME}.toggleWarning`, () => {
		warningEabled = !warningEabled;
		updateAllDecorations();
	});
	const disposableToggleInfo = vscode.commands.registerCommand(`${EXTNAME}.toggleInfo`, () => {
		infoEnabled = !infoEnabled;
		updateAllDecorations();
	});
	const disposableToggleHint = vscode.commands.registerCommand(`${EXTNAME}.toggleHint`, () => {
		hintEnabled = !hintEnabled;
		updateAllDecorations();
	});

	const disposableCopyProblemMessage = vscode.commands.registerTextEditorCommand(`${EXTNAME}.copyProblemMessage`, editor => {
		const aggregatedDiagnostics: IAggregatedDiagnostics = {};
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
		const source = renderedDiagnostic.source ? '[' + renderedDiagnostic.source + '] ' : '';
		vscode.env.clipboard.writeText(source + renderedDiagnostic.message);
	});

	context.subscriptions.push(workspace.onDidChangeConfiguration(updateConfig, EXTNAME));
	context.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage);
}

export function deactivate() {}
