import debounce from 'lodash/debounce';
import vscode, { window, workspace } from 'vscode';

import { IAggregatedDiagnostics, IConfig } from './types';
import { truncate } from './utils';
import { updateWorkspaceColorCustomizations, removeActiveTabDecorations, getWorkspaceColorCustomizations } from './workspaceSettings';

export function activate(context: vscode.ExtensionContext): void {
	const EXTENSION_NAME = 'errorLens';
	let config = workspace.getConfiguration(EXTENSION_NAME) as any as IConfig;
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

	let onDidChangeDiagnosticsDisposable: vscode.Disposable;
	let onDidSaveTextDocumentDisposable: vscode.Disposable;
	let onDidCursorChangeDisposable: vscode.Disposable;

	updateEverything();

	window.onDidChangeActiveTextEditor(textEditor => {
		if (textEditor) {
			updateDecorationsForUri(textEditor.document.uri, textEditor);
		} else {
			if (config.editorActiveTabDecorationEnabled) {
				// Settings GUI or image file is not a textEditor
				// That means - Error/Warning tab color should be cleared
				removeActiveTabDecorations();
			}
		}
	}, undefined, context.subscriptions);

	window.onDidChangeVisibleTextEditors(updateAllDecorations, undefined, context.subscriptions);

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

	function updateChangeDiagnosticListener(): void {
		if (onDidChangeDiagnosticsDisposable) {
			onDidChangeDiagnosticsDisposable.dispose();
		}
		if (config.onSave) {
			onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(e => {
				if (Date.now() - lastSavedTimestamp < 1000) {
					onChangedDiagnostics(e);
				}
			});
			return;
		}
		if (typeof config.delay === 'number' && config.delay > 0) {
			const debouncedOnChangeDiagnostics = debounce(onChangedDiagnostics, config.delay);
			const onChangedDiagnosticsDebounced = (diagnosticChangeEvent: vscode.DiagnosticChangeEvent): void => {
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
		onDidSaveTextDocumentDisposable = workspace.onDidSaveTextDocument(onSaveDocument);
	}
	function onSaveDocument(e: vscode.TextDocument): void {
		lastSavedTimestamp = Date.now();
		setTimeout(() => {
			updateDecorationsForUri(e.uri);
		}, 600);
	}

	function updateDecorationsForUri(uriToDecorate: vscode.Uri, editor?: vscode.TextEditor, range?: vscode.Range): void {
		// if (!uriToDecorate) {
		// 	return;
		// }

		if (editor === undefined) {
			editor = window.activeTextEditor;
		}
		if (!editor) {
			return;
		}

		if (!editor.document.uri.fsPath) {
			return;
		}

		if (!errorLensEnabled) {
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

		const aggregatedDiagnostics: IAggregatedDiagnostics = Object.create(null);
		const diagnostics = vscode.languages.getDiagnostics(uriToDecorate);
		// Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
		// a list of objects, grouping together diagnostics which occur on a single line.
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
			switch (aggregatedDiagnostic[0].severity) {
				case 0: addErrorLens = configErrorEnabled && errorEnabled; break;
				case 1: addErrorLens = configWarningEnabled && warningEabled; break;
				case 2: addErrorLens = configInfoEnabled && infoEnabled; break;
				case 3: addErrorLens = configHintEnabled && hintEnabled; break;
			}

			if (addErrorLens) {
				let messagePrefix = '';
				if (config.addAnnotationTextPrefixes) {
					if (aggregatedDiagnostic.length > 1) {
						// If > 1 diagnostic for this source line, the prefix is "Diagnostic #1 of N: "
						messagePrefix += `Diagnostic 1/${String(aggregatedDiagnostic.length)}: `;
					} else {
						// If only 1 diagnostic for this source line, show the diagnostic severity
						switch (aggregatedDiagnostic[0].severity) {
							case 0: messagePrefix += 'ERROR: '; break;
							case 1: messagePrefix += 'WARNING: '; break;
							case 2: messagePrefix += 'INFO: '; break;
							case 3:
							default: messagePrefix += 'HINT: '; break;
						}
					}
				}

				let decorationRenderOptions: vscode.DecorationRenderOptions = {};
				switch (aggregatedDiagnostic[0].severity) {
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
						range = editor.selection;
					}
					const diagnosticRange = aggregatedDiagnostic[0].range;

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

				switch (aggregatedDiagnostic[0].severity) {
					case 0: decorationOptionsError.push(diagnosticDecorationOptions); break;
					case 1: decorationOptionsWarning.push(diagnosticDecorationOptions); break;
					case 2: decorationOptionsInfo.push(diagnosticDecorationOptions); break;
					case 3: decorationOptionsHint.push(diagnosticDecorationOptions); break;
				}
			}
		}

		// The errorLensDecorationOptions<X> arrays have been built, now apply them.
		editor.setDecorations(decorationTypeError, decorationOptionsError);
		editor.setDecorations(decorationTypeWarning, decorationOptionsWarning);
		editor.setDecorations(decorationTypeInfo, decorationOptionsInfo);
		editor.setDecorations(decorationTypeHint, decorationOptionsHint);

		if (config.editorActiveTabDecorationEnabled &&
			editor === window.activeTextEditor) {
			const workspaceColorCustomizations = getWorkspaceColorCustomizations();

			let newTabBackground: string | undefined = '';

			// File has at least one warning
			if (diagnostics.some(diagnostic => diagnostic.severity === 1)) {
				newTabBackground = config.editorActiveTabWarningBackground;
			}
			// File has at least one error
			if (diagnostics.some(diagnostic => diagnostic.severity === 0)) {
				newTabBackground = config.editorActiveTabErrorBackground;
			}
			if (newTabBackground) {
				// Don't write the same value
				if (newTabBackground === workspaceColorCustomizations['tab.activeBackground']) {
					return;
				}
				workspaceColorCustomizations['tab.activeBackground'] = newTabBackground;
				updateWorkspaceColorCustomizations(workspaceColorCustomizations);
			} else {
				removeActiveTabDecorations();
			}
		}
	}

	function clearAllDecorations(): void {
		for (const editor of window.visibleTextEditors) {
			editor.setDecorations(decorationTypeError, []);
			editor.setDecorations(decorationTypeWarning, []);
			editor.setDecorations(decorationTypeInfo, []);
			editor.setDecorations(decorationTypeHint, []);
		}
	}

	function updateConfig(e: vscode.ConfigurationChangeEvent): void {
		if (!e.affectsConfiguration(EXTENSION_NAME)) return;

		config = workspace.getConfiguration(EXTENSION_NAME) as any as IConfig;

		decorationTypeError.dispose();
		decorationTypeWarning.dispose();
		decorationTypeInfo.dispose();
		decorationTypeHint.dispose();

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
		const gutterIconSize = config.gutterIconSize;

		let gutterIconSet = config.gutterIconSet;
		if (config.gutterIconSet !== 'borderless' &&
			config.gutterIconSet !== 'default' &&
			config.gutterIconSet !== 'circle' &&
			config.gutterIconSet !== 'defaultOutline') {
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

			errorGutterIconPath = config.errorGutterIconPath || context.asAbsolutePath(`./img/${gutterIconSet}/error-dark.svg`);
			errorGutterIconPathLight = config.light.errorGutterIconPath || (config.errorGutterIconPath ? config.errorGutterIconPath : false) || context.asAbsolutePath(`./img/${gutterIconSet}/error-light.svg`);
			warningGutterIconPath = config.warningGutterIconPath || context.asAbsolutePath(`./img/${gutterIconSet}/warning-dark.svg`);
			warningGutterIconPathLight = config.light.warningGutterIconPath || (config.warningGutterIconPath ? config.warningGutterIconPath : false) || context.asAbsolutePath(`./img/${gutterIconSet}/warning-light.svg`);
			infoGutterIconPath = config.infoGutterIconPath || context.asAbsolutePath(`./img/${gutterIconSet}/info-dark.svg`);
			infoGutterIconPathLight = config.light.infoGutterIconPath || (config.infoGutterIconPath ? config.infoGutterIconPath : false) || context.asAbsolutePath(`./img/${gutterIconSet}/info-light.svg`);
		}

		let errorBackground;
		let errorMessageBackground;
		let errorBackgroundLight;
		let errorForeground;
		let errorForegroundLight;
		let warningBackground;
		let warningMessageBackground;
		let warningBackgroundLight;
		let warningForeground;
		let warningForegroundLight;
		let infoBackground;
		let infoMessageBackground;
		let infoBackgroundLight;
		let infoForeground;
		let infoForegroundLight;
		let hintBackground;
		let hintMessageBackground;
		let hintBackgroundLight;
		let hintForeground;
		let hintForegroundLight;

		if (config.useColorContributions) {
			errorBackground = new vscode.ThemeColor('errorLens.errorBackground');
			errorMessageBackground = new vscode.ThemeColor('errorLens.errorMessageBackground');
			errorBackgroundLight = new vscode.ThemeColor('errorLens.errorBackgroundLight');
			errorForeground = new vscode.ThemeColor('errorLens.errorForeground');
			errorForegroundLight = new vscode.ThemeColor('errorLens.errorForegroundLight');
			warningBackground = new vscode.ThemeColor('errorLens.warningBackground');
			warningMessageBackground = new vscode.ThemeColor('errorLens.warningMessageBackground');
			warningBackgroundLight = new vscode.ThemeColor('errorLens.warningBackgroundLight');
			warningForeground = new vscode.ThemeColor('errorLens.warningForeground');
			warningForegroundLight = new vscode.ThemeColor('errorLens.warningForegroundLight');
			infoBackground = new vscode.ThemeColor('errorLens.infoBackground');
			infoMessageBackground = new vscode.ThemeColor('errorLens.infoMessageBackground');
			infoBackgroundLight = new vscode.ThemeColor('errorLens.infoBackgroundLight');
			infoForeground = new vscode.ThemeColor('errorLens.infoForeground');
			infoForegroundLight = new vscode.ThemeColor('errorLens.infoForegroundLight');
			hintBackground = new vscode.ThemeColor('errorLens.hintBackground');
			hintMessageBackground = new vscode.ThemeColor('errorLens.hintMessageBackground');
			hintBackgroundLight = new vscode.ThemeColor('errorLens.hintBackgroundLight');
			hintForeground = new vscode.ThemeColor('errorLens.hintForeground');
			hintForegroundLight = new vscode.ThemeColor('errorLens.hintForegroundLight');
		} else {
			errorBackground = config.errorBackground;
			errorMessageBackground = config.errorMessageBackground;
			errorForeground = config.errorForeground;
			errorBackgroundLight = config.light.errorBackground;
			errorForegroundLight = config.light.errorForeground;
			warningBackground = config.warningBackground;
			warningMessageBackground = config.warningMessageBackground;
			warningForeground = config.warningForeground;
			warningBackgroundLight = config.light.warningBackground;
			warningForegroundLight = config.light.warningForeground;
			infoBackground = config.infoBackground;
			infoMessageBackground = config.infoMessageBackground;
			infoForeground = config.infoForeground;
			infoBackgroundLight = config.light.infoBackground;
			infoForegroundLight = config.light.infoForeground;
			hintBackground = config.hintBackground;
			hintMessageBackground = config.hintMessageBackground;
			hintForeground = config.hintForeground;
			hintBackgroundLight = config.light.hintBackground;
			hintForegroundLight = config.light.hintForeground;
		}

		const onlyDigitsRegExp = /^\d+$/;
		const fontFamily = config.fontFamily ? `font-family:${config.fontFamily}` : '';
		const fontSize = config.fontSize ? `font-size:${onlyDigitsRegExp.test(config.fontSize) ? `${config.fontSize}px` : config.fontSize};line-height:1` : '';
		const paddingAndBorderRadius =
			config.errorMessageBackground ||
				config.warningMessageBackground ||
				config.infoMessageBackground ||
				config.hintMessageBackground ? 'border-radius:0.15em;padding:0.05em 0.3em;' : '';

		const afterProps: vscode.ThemableDecorationAttachmentRenderOptions = {
			fontStyle: config.fontStyleItalic ? 'italic' : 'normal',
			fontWeight: config.fontWeight,
			textDecoration: `;${fontFamily};${fontSize};${paddingAndBorderRadius};margin-left:${onlyDigitsRegExp.test(config.margin) ? `${config.margin}px` : config.margin};`,
		};

		decorationRenderOptionsError = {
			backgroundColor: errorBackground,
			gutterIconSize: errorGutterIconSizeAndColor,
			gutterIconPath: errorGutterIconPath,
			after: {
				...afterProps,
				color: errorForeground,
				backgroundColor: errorMessageBackground,
			},
			light: {
				backgroundColor: errorBackgroundLight,
				gutterIconSize: errorGutterIconSizeAndColorLight,
				gutterIconPath: errorGutterIconPathLight,
				after: {
					color: errorForegroundLight,
				},
			},
			isWholeLine: true,
		};
		decorationRenderOptionsWarning = {
			backgroundColor: warningBackground,
			gutterIconSize: warningGutterIconSizeAndColor,
			gutterIconPath: warningGutterIconPath,
			after: {
				...afterProps,
				color: warningForeground,
				backgroundColor: warningMessageBackground,
			},
			light: {
				backgroundColor: warningBackgroundLight,
				gutterIconSize: warningGutterIconSizeAndColorLight,
				gutterIconPath: warningGutterIconPathLight,
				after: {
					color: warningForegroundLight,
				},
			},
			isWholeLine: true,
		};
		decorationRenderOptionsInfo = {
			backgroundColor: infoBackground,
			gutterIconSize: infoGutterIconSizeAndColor,
			gutterIconPath: infoGutterIconPath,
			after: {
				...afterProps,
				color: infoForeground,
				backgroundColor: infoMessageBackground,
			},
			light: {
				backgroundColor: infoBackgroundLight,
				gutterIconSize: infoGutterIconSizeAndColorLight,
				gutterIconPath: infoGutterIconPathLight,
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
		setDecorationStyle();
		updateConfigEnabledLevels();
		updateChangeDiagnosticListener();
		updateOnSaveListener();
		updateCursorChangeListener();
		updateAllDecorations();
	}

	function updateAllDecorations(): void {
		for (const editor of window.visibleTextEditors) {
			updateDecorationsForUri(editor.document.uri, editor);
		}
	}
	function getGutterCircleSizeAndColor(color: string): string {
		return `${config.gutterIconSize};background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${color}"/></svg>');`;
	}

	const disposableToggleErrorLens = vscode.commands.registerCommand(`${EXTENSION_NAME}.toggle`, () => {
		errorLensEnabled = !errorLensEnabled;
		clearAllDecorations();
		updateAllDecorations();
	});
	const disposableToggleError = vscode.commands.registerCommand(`${EXTENSION_NAME}.toggleError`, () => {
		errorEnabled = !errorEnabled;
		updateAllDecorations();
	});
	const disposableToggleWarning = vscode.commands.registerCommand(`${EXTENSION_NAME}.toggleWarning`, () => {
		warningEabled = !warningEabled;
		updateAllDecorations();
	});
	const disposableToggleInfo = vscode.commands.registerCommand(`${EXTENSION_NAME}.toggleInfo`, () => {
		infoEnabled = !infoEnabled;
		updateAllDecorations();
	});
	const disposableToggleHint = vscode.commands.registerCommand(`${EXTENSION_NAME}.toggleHint`, () => {
		hintEnabled = !hintEnabled;
		updateAllDecorations();
	});

	const disposableCopyProblemMessage = vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.copyProblemMessage`, editor => {
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
		const source = renderedDiagnostic.source ? `[${renderedDiagnostic.source}] ` : '';
		vscode.env.clipboard.writeText(source + renderedDiagnostic.message);
	});

	context.subscriptions.push(workspace.onDidChangeConfiguration(updateConfig));
	context.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage);
}

export function deactivate(): void { }
