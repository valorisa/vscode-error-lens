import { extensionConfig, Global } from 'src/extension';
import { doUpdateGutterDecorations, getGutterStyles } from 'src/gutter';
import { AggregatedByLineDiagnostics } from 'src/types';
import { replaceLinebreaks, truncateString } from 'src/utils';
import { DecorationInstanceRenderOptions, DecorationOptions, DecorationRenderOptions, Diagnostic, languages, Range, TextEditor, ThemableDecorationAttachmentRenderOptions, ThemeColor, Uri, window } from 'vscode';
/**
 * Update all decoration styles: editor, gutter, status bar
 */
export function setDecorationStyle() {
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

	const errorBackground = new ThemeColor('errorLens.errorBackground');
	const errorBackgroundLight = new ThemeColor('errorLens.errorBackgroundLight');
	const errorForeground = new ThemeColor('errorLens.errorForeground');
	const errorForegroundLight = new ThemeColor('errorLens.errorForegroundLight');
	const errorMessageBackground = new ThemeColor('errorLens.errorMessageBackground');

	const warningBackground = new ThemeColor('errorLens.warningBackground');
	const warningBackgroundLight = new ThemeColor('errorLens.warningBackgroundLight');
	const warningForeground = new ThemeColor('errorLens.warningForeground');
	const warningForegroundLight = new ThemeColor('errorLens.warningForegroundLight');
	const warningMessageBackground = new ThemeColor('errorLens.warningMessageBackground');

	const infoBackground = new ThemeColor('errorLens.infoBackground');
	const infoBackgroundLight = new ThemeColor('errorLens.infoBackgroundLight');
	const infoForeground = new ThemeColor('errorLens.infoForeground');
	const infoForegroundLight = new ThemeColor('errorLens.infoForegroundLight');
	const infoMessageBackground = new ThemeColor('errorLens.infoMessageBackground');

	const hintBackground = new ThemeColor('errorLens.hintBackground');
	const hintBackgroundLight = new ThemeColor('errorLens.hintBackgroundLight');
	const hintForeground = new ThemeColor('errorLens.hintForeground');
	const hintForegroundLight = new ThemeColor('errorLens.hintForegroundLight');
	const hintMessageBackground = new ThemeColor('errorLens.hintMessageBackground');

	const statusBarErrorForeground = new ThemeColor('errorLens.statusBarErrorForeground');
	const statusBarWarningForeground = new ThemeColor('errorLens.statusBarWarningForeground');
	const statusBarInfoForeground = new ThemeColor('errorLens.statusBarInfoForeground');
	const statusBarHintForeground = new ThemeColor('errorLens.statusBarHintForeground');


	const onlyDigitsRegExp = /^\d+$/;
	const fontFamily = extensionConfig.fontFamily ? `font-family:${extensionConfig.fontFamily}` : '';
	const fontSize = extensionConfig.fontSize ? `font-size:${onlyDigitsRegExp.test(extensionConfig.fontSize) ? `${extensionConfig.fontSize}px` : extensionConfig.fontSize}` : '';
	const padding = extensionConfig.padding ? `padding:${onlyDigitsRegExp.test(extensionConfig.padding) ? `${extensionConfig.padding}px` : extensionConfig.padding}` : '';
	const margin = `margin-left:${onlyDigitsRegExp.test(extensionConfig.margin) ? `${extensionConfig.margin}px` : extensionConfig.margin}`;
	const borderRadius = `border-radius: ${extensionConfig.borderRadius || '0'}`;
	const scrollbarHack = extensionConfig.scrollbarHackEnabled ? 'position:absolute;pointer-events:none' : '';

	const afterProps: ThemableDecorationAttachmentRenderOptions = {
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
/**
 * Actually apply decorations for editor.
 */
export function doUpdateDecorations(editor: TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics, range?: Range) {
	const decorationOptionsError: DecorationOptions[] = [];
	const decorationOptionsWarning: DecorationOptions[] = [];
	const decorationOptionsInfo: DecorationOptions[] = [];
	const decorationOptionsHint: DecorationOptions[] = [];

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
		const diagnostic = aggregatedDiagnostic[0];
		const severity = diagnostic.severity;

		if (isSeverityEnabled(severity)) {
			let messagePrefix = '';
			if (extensionConfig.addNumberOfDiagnostics && aggregatedDiagnostic.length > 1) {
				messagePrefix += `[1/${aggregatedDiagnostic.length}] `;
			}
			if (extensionConfig.addAnnotationTextPrefixes) {
				messagePrefix += getAnnotationPrefix(severity);
			}
			/**
			 * Usually, it's enough to use `decoration type`,
			 * but decorations from different extensions can conflict.
			 * This code puts global `decoration type` options into `decoration instance` options,
			 * which is not great for perf, but probably the only workaround.
			 *
			 * https://github.com/usernamehw/vscode-error-lens/issues/25
			 */
			let decorationRenderOptions: DecorationRenderOptions = {};
			switch (severity) {
				case 0: decorationRenderOptions = Global.decorationRenderOptionsError; break;
				case 1: decorationRenderOptions = Global.decorationRenderOptionsWarning; break;
				case 2: decorationRenderOptions = Global.decorationRenderOptionsInfo; break;
				case 3: decorationRenderOptions = Global.decorationRenderOptionsHint; break;
			}

			const decInstanceRenderOptions: DecorationInstanceRenderOptions = {
				...decorationRenderOptions,
				after: {
					...decorationRenderOptions.after || {},
					// If the message has thousands of characters - VSCode will render all of them offscreen and the editor will freeze.
					contentText: extensionConfig.messageEnabled ?
						truncateString(messagePrefix + (extensionConfig.removeLinebreaks ? replaceLinebreaks(diagnostic.message) : diagnostic.message)) : '',
				},
			};

			let messageRange: Range | undefined;
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

			const diagnosticDecorationOptions: DecorationOptions = {
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
		doUpdateGutterDecorations(editor, aggregatedDiagnostics);
	}
	Global.statusBar.updateText(editor, aggregatedDiagnostics);
}

export function updateDecorationsForAllVisibleEditors() {
	for (const editor of window.visibleTextEditors) {
		updateDecorationsForUri(editor.document.uri, editor);
	}
}
/**
 * Update decorations for one editor.
 */
export function updateDecorationsForUri(uriToDecorate: Uri, editor?: TextEditor, range?: Range) {
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
			if (languages.match(pattern, editor.document) !== 0) {
				return;
			}
		}
	}

	doUpdateDecorations(editor, getDiagnosticAndGroupByLine(uriToDecorate), range);
}

/**
 * The aggregatedDiagnostics object will contain one or more objects, each object being keyed by `N`, where `N` is the line number where one or more diagnostics are being reported.
 *
 * Each object which is keyed by `N` will contain one or more `arrayDiagnostics[]` array of objects.
 * This facilitates gathering info about lines which contain more than one diagnostic.
 *
 * ```json
 * {
 *   67: [
 *     <Diagnostic #1>,
 *     <Diagnostic #2>
 *   ],
 *   93: [
 *     <Diagnostic #1>
 *   ]
 * }
 * ```
 */
export function getDiagnosticAndGroupByLine(uri: Uri): AggregatedByLineDiagnostics {
	const aggregatedDiagnostics: AggregatedByLineDiagnostics = Object.create(null);
	const diagnostics = languages.getDiagnostics(uri);

	for (const diagnostic of diagnostics) {
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
/**
 * Check multiple exclude sources if the diagnostic should not be shown.
 */
export function shouldExcludeDiagnostic(diagnostic: Diagnostic) {
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
/**
 * Add user defined prefix to diagnostics.
 */
export function getAnnotationPrefix(severity: number): string {
	return extensionConfig.annotationPrefix[severity] ?? '';
}
/**
 * `true` when diagnostic enabled in config & in temp variable
 */
export function isSeverityEnabled(severity: number) {
	if (
		severity === 0 && Global.configErrorEnabled && Global.errorEnabled ||
		severity === 1 && Global.configWarningEnabled && Global.warningEabled ||
		severity === 2 && Global.configInfoEnabled && Global.infoEnabled ||
		severity === 3 && Global.configHintEnabled && Global.hintEnabled
	) {
		return true;
	}
	return false;
}
