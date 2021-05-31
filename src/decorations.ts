import { extensionConfig, Global } from 'src/extension';
import { actuallyUpdateGutterDecorations, getGutterStyles } from 'src/gutter';
import { AggregatedByLineDiagnostics } from 'src/types';
import { replaceLinebreaks, truncateString } from 'src/utils';
import vscode, { Diagnostic, window } from 'vscode';

export function setDecorationStyle(): void {
	let gutter;
	if (extensionConfig.gutterIconsEnabled) {
		gutter = getGutterStyles(Global.extensionContext);

		if (Global.renderGutterIconsAsSeparateDecoration) {
			Global.decorationTypeGutterError = window.createTextEditorDecorationType({
				gutterIconPath: gutter.errorIconPath,
				gutterIconSize: extensionConfig.gutterIconSize,
				light: {
					gutterIconPath: gutter.errorIconPathLight,
					gutterIconSize: extensionConfig.gutterIconSize,
				},
			});
			Global.decorationTypeGutterWarning = window.createTextEditorDecorationType({
				gutterIconPath: gutter.warningIconPath,
				gutterIconSize: extensionConfig.gutterIconSize,
				light: {
					gutterIconPath: gutter.warningIconPathLight,
					gutterIconSize: extensionConfig.gutterIconSize,
				},
			});
			Global.decorationTypeGutterInfo = window.createTextEditorDecorationType({
				gutterIconPath: gutter.infoIconPath,
				gutterIconSize: extensionConfig.gutterIconSize,
				light: {
					gutterIconPath: gutter.infoIconPathLight,
					gutterIconSize: extensionConfig.gutterIconSize,
				},
			});
			// gutter will be rendered as a separate decoration, delete gutter from ordinary decorations
			gutter = undefined;
		}
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

	const statusBarErrorForeground = new vscode.ThemeColor('errorLens.statusBarErrorForeground');
	const statusBarWarningForeground = new vscode.ThemeColor('errorLens.statusBarWarningForeground');
	const statusBarInfoForeground = new vscode.ThemeColor('errorLens.statusBarInfoForeground');
	const statusBarHintForeground = new vscode.ThemeColor('errorLens.statusBarHintForeground');


	const onlyDigitsRegExp = /^\d+$/;
	const fontFamily = extensionConfig.fontFamily ? `font-family:${extensionConfig.fontFamily}` : '';
	const fontSize = extensionConfig.fontSize ? `font-size:${onlyDigitsRegExp.test(extensionConfig.fontSize) ? `${extensionConfig.fontSize}px` : extensionConfig.fontSize}` : '';
	const padding = extensionConfig.padding ? `padding:${onlyDigitsRegExp.test(extensionConfig.padding) ? `${extensionConfig.padding}px` : extensionConfig.padding}` : '';
	const margin = `margin-left:${onlyDigitsRegExp.test(extensionConfig.margin) ? `${extensionConfig.margin}px` : extensionConfig.margin}`;
	const borderRadius = `border-radius: ${extensionConfig.borderRadius || '0'}`;
	const scrollbarHack = extensionConfig.scrollbarHackEnabled ? 'position:absolute;pointer-events:none' : '';

	const afterProps: vscode.ThemableDecorationAttachmentRenderOptions = {
		fontStyle: extensionConfig.fontStyleItalic ? 'italic' : 'normal',
		fontWeight: extensionConfig.fontWeight,
		textDecoration: `none;${fontFamily};${fontSize};${padding};${margin};${borderRadius};${scrollbarHack}`,
	};

	Global.decorationRenderOptionsError = {
		backgroundColor: errorBackground,
		gutterIconSize: extensionConfig.gutterIconSize,
		gutterIconPath: gutter?.errorIconPath,
		after: {
			...afterProps,
			color: errorForeground,
			backgroundColor: errorMessageBackground,
		},
		light: {
			backgroundColor: errorBackgroundLight,
			gutterIconSize: extensionConfig.gutterIconSize,
			gutterIconPath: gutter?.errorIconPathLight,
			after: {
				color: errorForegroundLight,
			},
		},
		isWholeLine: true,
	};
	Global.decorationRenderOptionsWarning = {
		backgroundColor: warningBackground,
		gutterIconSize: extensionConfig.gutterIconSize,
		gutterIconPath: gutter?.warningIconPath,
		after: {
			...afterProps,
			color: warningForeground,
			backgroundColor: warningMessageBackground,
		},
		light: {
			backgroundColor: warningBackgroundLight,
			gutterIconSize: extensionConfig.gutterIconSize,
			gutterIconPath: gutter?.warningIconPathLight,
			after: {
				color: warningForegroundLight,
			},
		},
		isWholeLine: true,
	};
	Global.decorationRenderOptionsInfo = {
		backgroundColor: infoBackground,
		gutterIconSize: extensionConfig.gutterIconSize,
		gutterIconPath: gutter?.infoIconPath,
		after: {
			...afterProps,
			color: infoForeground,
			backgroundColor: infoMessageBackground,
		},
		light: {
			backgroundColor: infoBackgroundLight,
			gutterIconSize: extensionConfig.gutterIconSize,
			gutterIconPath: gutter?.infoIconPathLight,
			after: {
				color: infoForegroundLight,
			},
		},
		isWholeLine: true,
	};
	Global.decorationRenderOptionsHint = {
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

	if (!extensionConfig.messageEnabled) {
		Global.decorationRenderOptionsError.backgroundColor = undefined;
		Global.decorationRenderOptionsError.after = undefined;
		Global.decorationRenderOptionsError.light!.backgroundColor = undefined;
		Global.decorationRenderOptionsError.light!.after = undefined;

		Global.decorationRenderOptionsWarning.backgroundColor = undefined;
		Global.decorationRenderOptionsWarning.after = undefined;
		Global.decorationRenderOptionsWarning.light!.backgroundColor = undefined;
		Global.decorationRenderOptionsWarning.light!.after = undefined;

		Global.decorationRenderOptionsInfo.backgroundColor = undefined;
		Global.decorationRenderOptionsInfo.after = undefined;
		Global.decorationRenderOptionsInfo.light!.backgroundColor = undefined;
		Global.decorationRenderOptionsInfo.light!.after = undefined;

		Global.decorationRenderOptionsHint.backgroundColor = undefined;
		Global.decorationRenderOptionsHint.after = undefined;
		Global.decorationRenderOptionsHint.light!.backgroundColor = undefined;
		Global.decorationRenderOptionsHint.light!.after = undefined;
	}

	Global.decorationTypeError = window.createTextEditorDecorationType(Global.decorationRenderOptionsError);
	Global.decorationTypeWarning = window.createTextEditorDecorationType(Global.decorationRenderOptionsWarning);
	Global.decorationTypeInfo = window.createTextEditorDecorationType(Global.decorationRenderOptionsInfo);
	Global.decorationTypeHint = window.createTextEditorDecorationType(Global.decorationRenderOptionsHint);

	Global.statusBar.statusBarColors = [statusBarErrorForeground, statusBarWarningForeground, statusBarInfoForeground, statusBarHintForeground];
}

export function actuallyUpdateDecorations(editor: vscode.TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics, range?: vscode.Range): void {
	const decorationOptionsError: vscode.DecorationOptions[] = [];
	const decorationOptionsWarning: vscode.DecorationOptions[] = [];
	const decorationOptionsInfo: vscode.DecorationOptions[] = [];
	const decorationOptionsHint: vscode.DecorationOptions[] = [];

	let allowedLineNumbersToRenderDiagnostics: number[] | undefined;
	if (extensionConfig.followCursor === 'closestProblem') {
		if (range === undefined) {
			range = editor.selection;
		}
		const line = range.start.line;

		const aggregatedDiagnosticsAsArray = Object.entries(aggregatedDiagnostics).sort((a, b) => Math.abs(line - Number(a[0])) - Math.abs(line - Number(b[0])));
		aggregatedDiagnosticsAsArray.length = extensionConfig.followCursorMore + 1;// Reduce array length to the number of allowed rendered lines (decorations)
		allowedLineNumbersToRenderDiagnostics = aggregatedDiagnosticsAsArray.map(d => d[1][0].range.start.line);
	}

	for (const key in aggregatedDiagnostics) {
		const aggregatedDiagnostic = aggregatedDiagnostics[key].sort((a, b) => a.severity - b.severity);

		let addErrorLens = false;
		const diagnostic = aggregatedDiagnostic[0];
		const severity = diagnostic.severity;

		switch (severity) {
			case 0: addErrorLens = Global.configErrorEnabled && Global.errorEnabled; break;
			case 1: addErrorLens = Global.configWarningEnabled && Global.warningEabled; break;
			case 2: addErrorLens = Global.configInfoEnabled && Global.infoEnabled; break;
			case 3: addErrorLens = Global.configHintEnabled && Global.hintEnabled; break;
		}

		if (addErrorLens) {
			let messagePrefix = '';
			if (extensionConfig.addNumberOfDiagnostics && aggregatedDiagnostic.length > 1) {
				messagePrefix += `[1/${aggregatedDiagnostic.length}] `;
			}
			if (extensionConfig.addAnnotationTextPrefixes) {
				messagePrefix += getAnnotationPrefix(severity);
			}

			let decorationRenderOptions: vscode.DecorationRenderOptions = {};
			switch (severity) {
				case 0: decorationRenderOptions = Global.decorationRenderOptionsError; break;
				case 1: decorationRenderOptions = Global.decorationRenderOptionsWarning; break;
				case 2: decorationRenderOptions = Global.decorationRenderOptionsInfo; break;
				case 3: decorationRenderOptions = Global.decorationRenderOptionsHint; break;
			}

			// Generate a DecorationInstanceRenderOptions object which specifies the text which will be rendered
			// after the source-code line in the editor
			const decInstanceRenderOptions: vscode.DecorationInstanceRenderOptions = {
				...decorationRenderOptions,
				after: {
					...decorationRenderOptions.after || {},
					// If the message has thousands of characters - VSCode will render all of them offscreen and the editor will freeze.
					contentText: extensionConfig.messageEnabled ?
						truncateString(messagePrefix + (extensionConfig.removeLinebreaks ? replaceLinebreaks(diagnostic.message) : diagnostic.message)) : '',
				},
			};

			let messageRange: vscode.Range | undefined;
			if (extensionConfig.followCursor === 'allLines') {
				// Default value (most used)
				messageRange = diagnostic.range;
			} else {
				// Others require cursor tracking
				if (range === undefined) {
					range = editor.selection;
				}
				const diagnosticRange = diagnostic.range;

				if (extensionConfig.followCursor === 'activeLine') {
					const lineStart = range.start.line - extensionConfig.followCursorMore;
					const lineEnd = range.end.line + extensionConfig.followCursorMore;

					if (diagnosticRange.start.line >= lineStart && diagnosticRange.start.line <= lineEnd ||
							diagnosticRange.end.line >= lineStart && diagnosticRange.end.line <= lineEnd) {
						messageRange = diagnosticRange;
					}
				} else if (extensionConfig.followCursor === 'closestProblem') {
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

	editor.setDecorations(Global.decorationTypeError, decorationOptionsError);
	editor.setDecorations(Global.decorationTypeWarning, decorationOptionsWarning);
	editor.setDecorations(Global.decorationTypeInfo, decorationOptionsInfo);
	editor.setDecorations(Global.decorationTypeHint, decorationOptionsHint);

	if (Global.renderGutterIconsAsSeparateDecoration) {
		actuallyUpdateGutterDecorations(editor, aggregatedDiagnostics);
	}
	Global.statusBar.updateText(editor, aggregatedDiagnostics);
}

export function updateAllDecorations(): void {
	for (const editor of window.visibleTextEditors) {
		updateDecorationsForUri(editor.document.uri, editor);
	}
}

export function updateDecorationsForUri(uriToDecorate: vscode.Uri, editor?: vscode.TextEditor, range?: vscode.Range): void {
	if (editor === undefined) {
		editor = window.activeTextEditor;
	}
	if (!editor) {
		return;
	}

	if (!editor.document.uri.fsPath) {
		return;
	}

	if (Global.excludePatterns) {
		for (const pattern of Global.excludePatterns) {
			if (vscode.languages.match(pattern, editor.document) !== 0) {
				return;
			}
		}
	}

	actuallyUpdateDecorations(editor, getDiagnosticAndGroupByLine(uriToDecorate), range);
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
export function getDiagnosticAndGroupByLine(uri: vscode.Uri): AggregatedByLineDiagnostics {
	const aggregatedDiagnostics: AggregatedByLineDiagnostics = Object.create(null);
	const diagnostics = vscode.languages.getDiagnostics(uri);

	for (const diagnostic of diagnostics) {
		if (shoudExcludeDiagnostic(diagnostic)) {
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

export function shoudExcludeDiagnostic(diagnostic: Diagnostic) {
	for (const regex of Global.excludeRegexp) {
		if (regex.test(diagnostic.message)) {
			return true;
		}
	}
	if (diagnostic.source) {
		for (const source of Global.excludeSources) {
			if (source === diagnostic.source) {
				return true;
			}
		}
	}
	return false;
}

export function getAnnotationPrefix(severity: number): string {
	return extensionConfig.annotationPrefix[severity] ?? '';
}
