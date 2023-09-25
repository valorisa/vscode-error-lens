import { decorationTypes } from 'src/decorations';
import { $config } from 'src/extension';
import { extUtils } from 'src/utils/extUtils';
import { Range, ThemeColor, languages, window, type DecorationOptions, type Diagnostic, type TextEditor, type TextLine } from 'vscode';

export function createMultilineDecorations(): void {
	// ──── Multiline message ─────────────────────────────────────
	decorationTypes.decorationTypeMultilineError = window.createTextEditorDecorationType({
		after: {
			backgroundColor: new ThemeColor('errorLens.errorMessageBackground'),
			color: new ThemeColor('errorLens.errorForeground'),
		},
	});
	decorationTypes.decorationTypeMultilineWarning = window.createTextEditorDecorationType({
		after: {
			backgroundColor: new ThemeColor('errorLens.warningMessageBackground'),
			color: new ThemeColor('errorLens.warningForeground'),
		},
	});
	decorationTypes.decorationTypeMultilineInfo = window.createTextEditorDecorationType({
		after: {
			backgroundColor: new ThemeColor('errorLens.infoMessageBackground'),
			color: new ThemeColor('errorLens.infoForeground'),
		},
	});
	decorationTypes.decorationTypeMultilineHint = window.createTextEditorDecorationType({
		after: {
			backgroundColor: new ThemeColor('errorLens.hintMessageBackground'),
			color: new ThemeColor('errorLens.hintForeground'),
		},
	});

	// ──── Single problem line ───────────────────────────────────
	decorationTypes.decorationTypeMultilineErrorLineBackground = window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('errorLens.errorBackground'),
		isWholeLine: true,
	});
	decorationTypes.decorationTypeMultilineWarningLineBackground = window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('errorLens.warningBackground'),
		isWholeLine: true,
	});
	decorationTypes.decorationTypeMultilineInfoLineBackground = window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('errorLens.infoBackground'),
		isWholeLine: true,
	});
	decorationTypes.decorationTypeMultilineHintLineBackground = window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('errorLens.hintBackground'),
		isWholeLine: true,
	});
}

interface GroupedTextLines {
	startLineIndex: number;
	endLineIndex: number;
	minVisualLineLength: number;
	howManyLinesFromDiagnostic: number;
	score: number;
	textLines: TextLine[];
	startLineStartsWith: string;
}
/**
 * Try to find pockets of empty space where extension can draw multiline decorations.
 */
export function showMultilineDecoration(editor: TextEditor): void {
	const diagnosticsForUri = languages.getDiagnostics(editor.document.uri);
	if (diagnosticsForUri.length === 0 || !$config.messageEnabled) {
		// There are no problems in this file
		clearAllMultilineDecorations(editor);
		return;
	}

	// const cursorInViewport = isCursorInViewport(editor);
	// const closestDiagnosticInViewport = extUtils.getClosestDiagnosticInViewport(editor);

	let diagnostic: Diagnostic | undefined;
	if ($config.followCursor === 'closestProblemMultiline') {
		diagnostic = extUtils.getClosestDiagnostic(editor);
	} else if ($config.followCursor === 'closestProblemInViewportMultiline') {
		diagnostic = extUtils.getClosestDiagnosticInViewport(editor);
	} else if ($config.followCursor === 'closestProblemBySeverityMultiline') {
		diagnostic = extUtils.getClosestBySeverityDiagnostic(editor);
	}

	if (diagnostic === undefined) {
		clearAllMultilineDecorations(editor);
		return;
	}

	const indentStyle = editor.options.insertSpaces as boolean ? 'spaces' : 'tab';
	const indentSize = editor.options.tabSize as number;

	let messageLines = diagnostic.message.split(/[\n\r]/u);
	const maxMessageLineLength = messageLines.slice(0).sort((ln1, ln2) => ln2.length - ln1.length)[0].length;
	messageLines = messageLines.map(line => line.padEnd(maxMessageLineLength, ' '));
	// const isMessageSingleline = messageLines.length === 1;
	const isProblemInViewport = extUtils.isDiagnosticInViewport(editor, diagnostic);
	const visibleLineCount = getVisibleLineCount(editor);

	const howManyLinesInDecoration = Math.min(messageLines.length, $config.closestProblemMultiline.decorationMaxNumberOfLines, editor.document.lineCount);

	let result: GroupedTextLines[] = [];

	const groupedTextLines: TextLine[][] = [];

	for (const visibleRange of editor.visibleRanges) {
		for (let i = visibleRange.start.line; i < visibleRange.end.line; i++) {
			const textLines: TextLine[] = [];
			for (let j = i; j < (i + howManyLinesInDecoration); j++) {
				if (j > editor.document.lineCount - 1) {
					break;
				}
				const lineAt = editor.document.lineAt(j);
				if (lineAt) {
					textLines.push(lineAt);
				}
			}
			groupedTextLines.push(textLines);
		}
	}

	for (const textLines of groupedTextLines) {
		const howManyLinesFromDiagnostic = howManyLinesAwayFromDiagnostic(textLines[0].range.start.line, textLines.at(-1)!.range.end.line, diagnostic);
		const minLine = textLines.slice(0).sort((tl1, tl2) => extUtils.getVisualLineLength(tl2, indentSize, indentStyle) - extUtils.getVisualLineLength(tl1, indentSize, indentStyle))[0];
		const minVisualLineLength = Math.max(extUtils.getVisualLineLength(minLine, indentSize, indentStyle), $config.closestProblemMultiline.startColumn);

		result.push({
			startLineIndex: textLines[0].range.start.line,
			endLineIndex: textLines.at(-1)!.range.end.line,
			howManyLinesFromDiagnostic,
			minVisualLineLength,
			score: scoreGroupedLines({
				textLines,
				diagnostic,
				messageLines,
				howManyLinesFromDiagnostic,
				minVisualLineLength,
				visibleLineCount,
				preferFittingMessageMultiplier: $config.closestProblemMultiline.preferFittingMessageMultiplier,
			}),
			textLines,
			startLineStartsWith: textLines[0].text.slice(0, 10),
		});
	}

	result = result.slice(0).sort((group1, group2) => group2.score - group1.score);
	// console.table(result);
	const whereToShowDecoration = result[0];

	const decorationsToDraw: DecorationOptions[] = [];
	let i = 0;
	for (const textLine of whereToShowDecoration.textLines) {
		const margin = $config.closestProblemMultiline.margin + whereToShowDecoration.minVisualLineLength - extUtils.getVisualLineLength(textLine, indentSize, indentStyle);
		const borderRadius = makeRoundCornersForDecoration({ isFirstLineOfDecoration: i === 0, isLastLineOfDecoration: i === whereToShowDecoration.textLines.length - 1 });
		const skipBackground = $config.closestProblemMultiline.highlightProblemLine && textLine.range.start.line === diagnostic.range.start.line;

		decorationsToDraw.push({
			range: new Range(
				textLine.range.start.line,
				textLine.range.end.character,
				textLine.range.start.line,
				textLine.range.end.character,
			),
			renderOptions: {
				after: {
					backgroundColor: skipBackground ? '#fff0' : undefined,
					margin: `0 0 0 ${margin >= 0 ? margin : 0}ch`,
					contentText: messageLines[i],
					height: '100%',
					textDecoration: `;white-space:pre;padding:0 ${$config.closestProblemMultiline.padding}ch;${borderRadius};`, // Keep leading whitespace in ::after content
				},
			},
		});
		i++;
	}

	let errorDecorations: DecorationOptions[] = [];
	let warningDecorations: DecorationOptions[] = [];
	let infoDecorations: DecorationOptions[] = [];
	let hintDecorations: DecorationOptions[] = [];

	let errorLineDecorations: Range[] = [];
	let warningLineDecorations: Range[] = [];
	let infoLineDecorations: Range[] = [];
	let hintLineDecorations: Range[] = [];

	if (diagnostic.severity === 0) {
		errorDecorations = decorationsToDraw;
		errorLineDecorations = [new Range(diagnostic.range.start, diagnostic.range.start)];
	} else if (diagnostic.severity === 1) {
		warningDecorations = decorationsToDraw;
		warningLineDecorations = [new Range(diagnostic.range.start, diagnostic.range.start)];
	} else if (diagnostic.severity === 2) {
		infoDecorations = decorationsToDraw;
		infoLineDecorations = [new Range(diagnostic.range.start, diagnostic.range.start)];
	} else if (diagnostic.severity === 3) {
		hintDecorations = decorationsToDraw;
		hintLineDecorations = [new Range(diagnostic.range.start, diagnostic.range.start)];
	}

	editor.setDecorations(decorationTypes.decorationTypeMultilineError, errorDecorations);
	editor.setDecorations(decorationTypes.decorationTypeMultilineWarning, warningDecorations);
	editor.setDecorations(decorationTypes.decorationTypeMultilineInfo, infoDecorations);
	editor.setDecorations(decorationTypes.decorationTypeMultilineHint, hintDecorations);

	if ($config.closestProblemMultiline.highlightProblemLine) {
		editor.setDecorations(decorationTypes.decorationTypeMultilineErrorLineBackground, errorLineDecorations);
		editor.setDecorations(decorationTypes.decorationTypeMultilineWarningLineBackground, warningLineDecorations);
		editor.setDecorations(decorationTypes.decorationTypeMultilineInfoLineBackground, infoLineDecorations);
		editor.setDecorations(decorationTypes.decorationTypeMultilineHintLineBackground, hintLineDecorations);
	}
}

function clearAllMultilineDecorations(editor: TextEditor): void {
	editor.setDecorations(decorationTypes.decorationTypeMultilineError, []);
	editor.setDecorations(decorationTypes.decorationTypeMultilineWarning, []);
	editor.setDecorations(decorationTypes.decorationTypeMultilineInfo, []);
	editor.setDecorations(decorationTypes.decorationTypeMultilineHint, []);

	editor.setDecorations(decorationTypes.decorationTypeMultilineErrorLineBackground, []);
	editor.setDecorations(decorationTypes.decorationTypeMultilineWarningLineBackground, []);
	editor.setDecorations(decorationTypes.decorationTypeMultilineInfoLineBackground, []);
	editor.setDecorations(decorationTypes.decorationTypeMultilineHintLineBackground, []);
}

/**
 * Round corners on multiple decoration lines to make an illusion that they are all a part of single decoration.
 */
function makeRoundCornersForDecoration({ isFirstLineOfDecoration, isLastLineOfDecoration }: { isFirstLineOfDecoration: boolean; isLastLineOfDecoration: boolean }): string {
	let borderRadiusValue = '';
	const configBorderRadius = $config.closestProblemMultiline.borderRadius || $config.borderRadius;

	if (isFirstLineOfDecoration) {
		borderRadiusValue = `${configBorderRadius} ${configBorderRadius} 0 0`;
	} else if (isLastLineOfDecoration) {
		borderRadiusValue = `0 0 ${configBorderRadius} ${configBorderRadius}`;
	}
	if (isFirstLineOfDecoration && isLastLineOfDecoration) {
		borderRadiusValue = `${configBorderRadius}`;
	}

	return `border-radius:${borderRadiusValue}`;
}
/**
 * Calculate how far away (in lines) the diagnostic is from the place where multiline
 * decoration will be shown.
 */
function howManyLinesAwayFromDiagnostic(startLine: number, endLine: number, diagnostic: Diagnostic): number {
	return Math.min(
		Math.abs(startLine - diagnostic.range.start.line),
		Math.abs(endLine - diagnostic.range.start.line),
	);
}

function isCursorInViewport(editor: TextEditor): boolean {
	const cursorLine = editor.selection.active.line;
	for (const visibleRange of editor.visibleRanges) {
		if (cursorLine >= visibleRange.start.line && cursorLine <= visibleRange.end.line) {
			return true;
		}
	}
	return false;
}

interface ScoreGroupedLinesArg {
	textLines: TextLine[];
	messageLines: string[];
	howManyLinesFromDiagnostic: number;
	preferFittingMessageMultiplier: number;
	minVisualLineLength: number;
	visibleLineCount: number;
	diagnostic: Diagnostic;
}

/**
 * Assuming this about a user's viewport (not a split/grid):
 * - Calculate visible line count from `editor.visibleRanges`
 * - Average column count would be ~130-200 characters (take lowest 130, minimap/sidebar/split/grid will mess up calculations)
 *
 * Try to balance the empty space size (fit more of the message content) and
 * the distance of that empty space from where the diagnostic is located (the closer - the better).
 *
 * Give 100 points for the group that is 0 lines away from diagnostic, 0 - for box that is >visibleLineCount lines away
 * Give 100 points for the group that fits 100% of the message text, 0 - for box that fits none of the message text
 */
function scoreGroupedLines({ textLines, messageLines, howManyLinesFromDiagnostic, minVisualLineLength, visibleLineCount, preferFittingMessageMultiplier, diagnostic }: ScoreGroupedLinesArg): number {
	const messageTotalCharacters = messageLines.join('').length;
	const avgCharCount = 130;
	const distanceScore = howManyLinesFromDiagnostic >= visibleLineCount ? 0 : Math.floor(100 - (howManyLinesFromDiagnostic / visibleLineCount * 100));

	const oneLineCharactersFit = avgCharCount - minVisualLineLength;
	const totalCharactersThatDontFit = messageLines.reduce((acc, lineText) => acc + (
		(lineText.length <= oneLineCharactersFit) ? 0 : lineText.length - oneLineCharactersFit
	), 0);
	const messageFitScore = totalCharactersThatDontFit === 0 ? 100 : (100 - (100 / (messageTotalCharacters / 100 * totalCharactersThatDontFit)));

	// eslint-disable-next-line prefer-const
	let score = (distanceScore + (messageFitScore * preferFittingMessageMultiplier));

	// Prefer the group that starts at the same place where diagnostic starts
	// if (howManyLinesFromDiagnostic === 0 && textLines[0].range.start.line === diagnostic.range.start.line) {
	// 	score += 2;
	// }

	return Math.round(score);
}

function getVisibleLineCount(editor: TextEditor): number {
	let visibleLineCount = 0;
	for (const visibleRange of editor.visibleRanges) {
		visibleLineCount += visibleRange.end.line - visibleRange.start.line;
	}
	return visibleLineCount;
}
