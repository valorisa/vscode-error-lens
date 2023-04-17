/* eslint-disable no-param-reassign */
import { $config, $state } from 'src/extension';
import { doUpdateGutterDecorations, getGutterStyles, type Gutter } from 'src/gutter';
import { createHoverForDiagnostic } from 'src/hover/hover';
import { Constants } from 'src/types';
import { extensionUtils, type GroupedByLineDiagnostics } from 'src/utils/extensionUtils';
import { utils } from 'src/utils/utils';
import { Range, ThemeColor, languages, window, workspace, type DecorationInstanceRenderOptions, type DecorationOptions, type DecorationRenderOptions, type ExtensionContext, type TextEditor, type TextEditorDecorationType, type ThemableDecorationAttachmentRenderOptions, type Uri } from 'vscode';

type DecorationKeys = 'decorationTypeError' | 'decorationTypeGutterError' | 'decorationTypeGutterInfo' | 'decorationTypeGutterWarning' | 'decorationTypeHint' | 'decorationTypeInfo' | 'decorationTypeWarning';
export const decorationTypes = {} as unknown as Record<DecorationKeys, TextEditorDecorationType>;

/**
 * Update all decoration styles: editor, gutter, status bar
 */
export function setDecorationStyle(context: ExtensionContext): void {
	disposeAllDecorations();

	let gutter: Gutter | undefined;
	if ($config.gutterIconsEnabled) {
		gutter = getGutterStyles(context);

		if ($state.renderGutterIconsAsSeparateDecoration) {
			decorationTypes.decorationTypeGutterError = window.createTextEditorDecorationType({
				gutterIconPath: gutter.errorIconPath,
				gutterIconSize: $config.gutterIconSize,
				light: {
					gutterIconPath: gutter.errorIconPathLight,
					gutterIconSize: $config.gutterIconSize,
				},
			});
			decorationTypes.decorationTypeGutterWarning = window.createTextEditorDecorationType({
				gutterIconPath: gutter.warningIconPath,
				gutterIconSize: $config.gutterIconSize,
				light: {
					gutterIconPath: gutter.warningIconPathLight,
					gutterIconSize: $config.gutterIconSize,
				},
			});
			decorationTypes.decorationTypeGutterInfo = window.createTextEditorDecorationType({
				gutterIconPath: gutter.infoIconPath,
				gutterIconSize: $config.gutterIconSize,
				light: {
					gutterIconPath: gutter.infoIconPathLight,
					gutterIconSize: $config.gutterIconSize,
				},
			});
			// gutter will be rendered as a separate decoration, delete gutter from ordinary decorations
			gutter = undefined;
		}
	}

	let errorBackground: ThemeColor | undefined = new ThemeColor('errorLens.errorBackground');
	let errorBackgroundLight: ThemeColor | undefined = new ThemeColor('errorLens.errorBackgroundLight');
	const errorForeground = new ThemeColor('errorLens.errorForeground');
	const errorForegroundLight = new ThemeColor('errorLens.errorForegroundLight');
	let errorMessageBackground: ThemeColor | undefined = new ThemeColor('errorLens.errorMessageBackground');

	let warningBackground: ThemeColor | undefined = new ThemeColor('errorLens.warningBackground');
	let warningBackgroundLight: ThemeColor | undefined = new ThemeColor('errorLens.warningBackgroundLight');
	const warningForeground = new ThemeColor('errorLens.warningForeground');
	const warningForegroundLight = new ThemeColor('errorLens.warningForegroundLight');
	let warningMessageBackground: ThemeColor | undefined = new ThemeColor('errorLens.warningMessageBackground');

	let infoBackground: ThemeColor | undefined = new ThemeColor('errorLens.infoBackground');
	let infoBackgroundLight: ThemeColor | undefined = new ThemeColor('errorLens.infoBackgroundLight');
	const infoForeground = new ThemeColor('errorLens.infoForeground');
	const infoForegroundLight = new ThemeColor('errorLens.infoForegroundLight');
	let infoMessageBackground: ThemeColor | undefined = new ThemeColor('errorLens.infoMessageBackground');

	let hintBackground: ThemeColor | undefined = new ThemeColor('errorLens.hintBackground');
	let hintBackgroundLight: ThemeColor | undefined = new ThemeColor('errorLens.hintBackgroundLight');
	const hintForeground = new ThemeColor('errorLens.hintForeground');
	const hintForegroundLight = new ThemeColor('errorLens.hintForegroundLight');
	let hintMessageBackground: ThemeColor | undefined = new ThemeColor('errorLens.hintMessageBackground');

	const statusBarErrorForeground = new ThemeColor('errorLens.statusBarErrorForeground');
	const statusBarWarningForeground = new ThemeColor('errorLens.statusBarWarningForeground');
	const statusBarInfoForeground = new ThemeColor('errorLens.statusBarInfoForeground');
	const statusBarHintForeground = new ThemeColor('errorLens.statusBarHintForeground');

	if ($config.messageBackgroundMode === 'line') {
		errorMessageBackground = undefined;
		warningMessageBackground = undefined;
		infoMessageBackground = undefined;
		hintMessageBackground = undefined;
	} else if ($config.messageBackgroundMode === 'message') {
		errorBackground = undefined;
		errorBackgroundLight = undefined;
		warningBackground = undefined;
		warningBackgroundLight = undefined;
		infoBackground = undefined;
		infoBackgroundLight = undefined;
		hintBackground = undefined;
		hintBackgroundLight = undefined;
	} else if ($config.messageBackgroundMode === 'none') {
		errorBackground = undefined;
		errorBackgroundLight = undefined;
		warningBackground = undefined;
		warningBackgroundLight = undefined;
		infoBackground = undefined;
		infoBackgroundLight = undefined;
		hintBackground = undefined;
		hintBackgroundLight = undefined;

		errorMessageBackground = undefined;
		warningMessageBackground = undefined;
		infoMessageBackground = undefined;
		hintMessageBackground = undefined;
	}

	const onlyDigitsRegExp = /^\d+$/u;
	const fontFamily = $config.fontFamily ? `font-family:${$config.fontFamily}` : '';
	const fontSize = $config.fontSize ? `font-size:${onlyDigitsRegExp.test($config.fontSize) ? `${$config.fontSize}px` : $config.fontSize}` : '';
	const marginLeft = onlyDigitsRegExp.test($config.margin) ? `${$config.margin}px` : $config.margin;
	const padding = $config.padding ? `padding:${onlyDigitsRegExp.test($config.padding) ? `${$config.padding}px` : $config.padding}` : '';
	const borderRadius = `border-radius: ${$config.borderRadius || '0'}`;
	const scrollbarHack = $config.scrollbarHackEnabled ? 'position:absolute;pointer-events:none;top:50%;transform:translateY(-50%);' : '';

	const afterProps: ThemableDecorationAttachmentRenderOptions = {
		fontStyle: $config.fontStyleItalic ? 'italic' : 'normal',
		fontWeight: $config.fontWeight,
		margin: `0 0 0 ${marginLeft}`,
		textDecoration: `none;${fontFamily};${fontSize};${padding};${borderRadius};${scrollbarHack}`,
	};

	const decorationRenderOptionsError: DecorationRenderOptions = {
		backgroundColor: errorBackground,
		gutterIconSize: $config.gutterIconSize,
		gutterIconPath: gutter?.errorIconPath,
		after: {
			...afterProps,
			color: errorForeground,
			backgroundColor: errorMessageBackground,
		},
		light: {
			backgroundColor: errorBackgroundLight,
			gutterIconSize: $config.gutterIconSize,
			gutterIconPath: gutter?.errorIconPathLight,
			after: {
				color: errorForegroundLight,
			},
		},
		isWholeLine: true,
	};
	const decorationRenderOptionsWarning: DecorationRenderOptions = {
		backgroundColor: warningBackground,
		gutterIconSize: $config.gutterIconSize,
		gutterIconPath: gutter?.warningIconPath,
		after: {
			...afterProps,
			color: warningForeground,
			backgroundColor: warningMessageBackground,
		},
		light: {
			backgroundColor: warningBackgroundLight,
			gutterIconSize: $config.gutterIconSize,
			gutterIconPath: gutter?.warningIconPathLight,
			after: {
				color: warningForegroundLight,
			},
		},
		isWholeLine: true,
	};
	const decorationRenderOptionsInfo: DecorationRenderOptions = {
		backgroundColor: infoBackground,
		gutterIconSize: $config.gutterIconSize,
		gutterIconPath: gutter?.infoIconPath,
		after: {
			...afterProps,
			color: infoForeground,
			backgroundColor: infoMessageBackground,
		},
		light: {
			backgroundColor: infoBackgroundLight,
			gutterIconSize: $config.gutterIconSize,
			gutterIconPath: gutter?.infoIconPathLight,
			after: {
				color: infoForegroundLight,
			},
		},
		isWholeLine: true,
	};
	const decorationRenderOptionsHint: DecorationRenderOptions = {
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

	if (!$config.messageEnabled) {
		decorationRenderOptionsError.backgroundColor = undefined;
		decorationRenderOptionsError.after = undefined;
		decorationRenderOptionsError.light!.backgroundColor = undefined;
		decorationRenderOptionsError.light!.after = undefined;

		decorationRenderOptionsWarning.backgroundColor = undefined;
		decorationRenderOptionsWarning.after = undefined;
		decorationRenderOptionsWarning.light!.backgroundColor = undefined;
		decorationRenderOptionsWarning.light!.after = undefined;

		decorationRenderOptionsInfo.backgroundColor = undefined;
		decorationRenderOptionsInfo.after = undefined;
		decorationRenderOptionsInfo.light!.backgroundColor = undefined;
		decorationRenderOptionsInfo.light!.after = undefined;

		decorationRenderOptionsHint.backgroundColor = undefined;
		decorationRenderOptionsHint.after = undefined;
		decorationRenderOptionsHint.light!.backgroundColor = undefined;
		decorationRenderOptionsHint.light!.after = undefined;
	}

	decorationTypes.decorationTypeError = window.createTextEditorDecorationType(decorationRenderOptionsError);
	decorationTypes.decorationTypeWarning = window.createTextEditorDecorationType(decorationRenderOptionsWarning);
	decorationTypes.decorationTypeInfo = window.createTextEditorDecorationType(decorationRenderOptionsInfo);
	decorationTypes.decorationTypeHint = window.createTextEditorDecorationType(decorationRenderOptionsHint);

	$state.statusBarMessage.statusBarColors = [statusBarErrorForeground, statusBarWarningForeground, statusBarInfoForeground, statusBarHintForeground];
}
/**
 * Actually apply decorations for editor.
 * @param range Only allow decorating lines in this range.
 */
export function doUpdateDecorations(editor: TextEditor, groupedDiagnostics: GroupedByLineDiagnostics, range?: Range): void {
	const decorationOptionsError: DecorationOptions[] = [];
	const decorationOptionsWarning: DecorationOptions[] = [];
	const decorationOptionsInfo: DecorationOptions[] = [];
	const decorationOptionsHint: DecorationOptions[] = [];

	let allowedLineNumbersToRenderDiagnostics: number[] | undefined;
	if ($config.followCursor === 'closestProblem') {
		if (range === undefined) {
			range = editor.selection;
		}
		const line = range.start.line;

		const groupedDiagnosticsAsArray = Object.entries(groupedDiagnostics).sort((a, b) => Math.abs(line - Number(a[0])) - Math.abs(line - Number(b[0])));
		groupedDiagnosticsAsArray.length = $config.followCursorMore + 1;// Reduce array length to the number of allowed rendered lines (decorations)
		allowedLineNumbersToRenderDiagnostics = groupedDiagnosticsAsArray.map(d => d[1][0].range.start.line);
	}

	for (const key in groupedDiagnostics) {
		const groupedDiagnostic = groupedDiagnostics[key].sort((a, b) => a.severity - b.severity);
		const diagnostic = groupedDiagnostic[0];
		const severity = diagnostic.severity;

		if (!extensionUtils.isSeverityEnabled(severity)) {
			continue;
		}

		let message: string | undefined = extensionUtils.diagnosticToInlineMessage($config.messageTemplate, diagnostic, groupedDiagnostic.length);

		if (!$config.messageEnabled || $config.messageMaxChars === 0) {
			message = undefined;
		} else {
			// If the message has thousands of characters - VSCode will render all of them offscreen and the editor will freeze.
			// If the message has linebreaks - it will cut off the message in that place.
			message = utils.truncateString($config.removeLinebreaks ? utils.replaceLinebreaks(message, $config.replaceLinebreaksSymbol) : message, $config.messageMaxChars);
		}

		const decInstanceRenderOptions: DecorationInstanceRenderOptions = {
			after: {
				contentText: message,
			},
		};

		let messageRange: Range | undefined;
		if ($config.followCursor === 'allLines') {
			// Default value (most used)
			messageRange = diagnostic.range;
		} else {
			// Others require cursor tracking
			if (range === undefined) {
				range = editor.selection;
			}
			const diagnosticRange = diagnostic.range;

			if ($config.followCursor === 'activeLine') {
				const lineStart = range.start.line - $config.followCursorMore;
				const lineEnd = range.end.line + $config.followCursorMore;

				if (
					((diagnosticRange.start.line >= lineStart) && (diagnosticRange.start.line <= lineEnd)) ||
						((diagnosticRange.end.line >= lineStart) && (diagnosticRange.end.line <= lineEnd))
				) {
					messageRange = diagnosticRange;
				}
			} else if ($config.followCursor === 'allLinesExceptActive') {
				const lineStart = range.start.line;
				const lineEnd = range.end.line;

				if (
					((diagnosticRange.start.line >= lineStart) && (diagnosticRange.start.line <= lineEnd)) ||
						((diagnosticRange.end.line >= lineStart) && (diagnosticRange.end.line <= lineEnd))
				) {
					messageRange = undefined;
				} else {
					messageRange = diagnosticRange;
				}
			} else if ($config.followCursor === 'closestProblem') {
				if (allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.start.line) || allowedLineNumbersToRenderDiagnostics!.includes(diagnosticRange.end.line)) {
					messageRange = diagnosticRange;
				}
			}

			if (!messageRange) {
				continue;
			}
		}

		const diagnosticDecorationOptions: DecorationOptions = {
			range: new Range(messageRange.start.line, messageRange.start.character, messageRange.start.line, messageRange.start.character),
			hoverMessage: createHoverForDiagnostic({
				diagnostic,
				buttonsEnabled: $config.editorHoverPartsEnabled.buttonsEnabled,
				messageEnabled: $config.editorHoverPartsEnabled.messageEnabled,
			}),
			renderOptions: decInstanceRenderOptions,
		};

		switch (severity) {
			case 0: {
				decorationOptionsError.push(diagnosticDecorationOptions);
				break;
			}
			case 1: {
				decorationOptionsWarning.push(diagnosticDecorationOptions);
				break;
			}
			case 2: {
				decorationOptionsInfo.push(diagnosticDecorationOptions);
				break;
			}
			case 3: {
				decorationOptionsHint.push(diagnosticDecorationOptions);
				break;
			}
			default: {}
		}
	}

	editor.setDecorations(decorationTypes.decorationTypeError, decorationOptionsError);
	editor.setDecorations(decorationTypes.decorationTypeWarning, decorationOptionsWarning);
	editor.setDecorations(decorationTypes.decorationTypeInfo, decorationOptionsInfo);
	editor.setDecorations(decorationTypes.decorationTypeHint, decorationOptionsHint);

	if ($state.renderGutterIconsAsSeparateDecoration) {
		doUpdateGutterDecorations(editor, groupedDiagnostics);
	}
	$state.statusBarMessage.updateText(editor, groupedDiagnostics);
}

export function updateDecorationsForAllVisibleEditors(): void {
	for (const editor of window.visibleTextEditors) {
		updateDecorationsForUri({
			uri: editor.document.uri,
			editor,
		});
	}
}
/**
 * Update decorations for one editor.
 */
export function updateDecorationsForUri({
	uri,
	editor,
	groupedDiagnostics,
	range,
}: {
	uri: Uri;
	editor?: TextEditor;
	groupedDiagnostics?: GroupedByLineDiagnostics;
	range?: Range;
}): void {
	if (editor === undefined) {
		editor = window.activeTextEditor;
	}
	if (!editor) {
		return;
	}

	if (!editor.document.uri.fsPath) {
		return;
	}

	if (
		(!$config.enableOnDiffView && editor.viewColumn === undefined) &&
		editor.document.uri.scheme !== 'vscode-notebook-cell'
	) {
		doUpdateDecorations(editor, {});
		return;
	}

	if (!$config.enabledInMergeConflict) {
		const editorText = editor.document.getText();
		if (
			editorText.includes(Constants.MergeConflictSymbol1) ||
			editorText.includes(Constants.MergeConflictSymbol2) ||
			editorText.includes(Constants.MergeConflictSymbol3)
		) {
			doUpdateDecorations(editor, {});
			return;
		}
	}

	if ($state.excludePatterns) {
		for (const pattern of $state.excludePatterns) {
			if (languages.match(pattern, editor.document) !== 0) {
				return;
			}
		}
	}

	const currentWorkspacePath = workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
	if (
		currentWorkspacePath &&
		$config.excludeWorkspaces.includes(currentWorkspacePath)
	) {
		return;
	}

	doUpdateDecorations(editor, groupedDiagnostics ?? extensionUtils.groupDiagnosticsByLine(languages.getDiagnostics(uri)), range);
}

function disposeAllDecorations(): void {
	for (const decorationType of Object.values(decorationTypes)) {
		decorationType?.dispose();
	}
}

