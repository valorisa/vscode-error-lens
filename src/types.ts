import vscode from 'vscode';

export interface ExtensionConfig {
	/**
	 * Overwrite gutter items for light theme
	 */
	light: {
		errorGutterIconPath?: string;
		warningGutterIconPath?: string;
		infoGutterIconPath?: string;

		errorGutterIconColor: string;
		warningGutterIconColor: string;
		infoGutterIconColor: string;
	};

	fontFamily: string;
	fontWeight: string;
	fontSize: string;
	fontStyleItalic: boolean;

	margin: string;
	padding: string;
	borderRadius: string;

	/**
	 * Controls whether inline message is shown or not (Including background highlight).
	 */
	messageEnabled: boolean;
	/**
	 * Choose which levels of diagnostics to highlight.
	 */
	enabledDiagnosticLevels: string[];
	/**
	 * Specify diagnostic message prefixes (when `addAnnotationTextPrefixes` is enabled)
	 */
	annotationPrefix: string[];
	/**
	 * When enabled - prepends diagnostic severity ('ERROR:', 'WARNING:' etc) to the message.
	 * (Prefixes can be configured with `annotationPrefix` setting).
	 */
	addAnnotationTextPrefixes: boolean;
	/**
	 * When enabled - prepends number of diagnostics on the line. Like: `[1/2]`.
	 */
	addNumberOfDiagnostics: boolean;
	/**
	 * Array of diagnostic messages that should not be decorated. Matches against `Diagnostic.message`.
	 */
	exclude: string[];
	/**
	 * Specify sources that should not be highlighted (string).
	 */
	excludeBySource: string[];
	/**
	 * Glob matching files that should not be decorated. Matches against absolute file path.
	 */
	excludePatterns: string[];

	statusBarMessageEnabled: boolean;
	statusBarMessageType: 'activeLine' | 'closestProblem';
	statusBarColorsEnabled: boolean;
	statusBarCommand: 'copyMessage' | 'goToLine' | 'goToProblem';
	/**
	 * Adds delay before showing diagnostic.
	 */
	delay?: number;
	/**
	 * Highlight only portion of the problems.
	 * For instance, only active line or the closest to the cursor diasnostic.
	 */
	followCursor: FollowCursor;
	/**
	 * Augments `followCursor`.
	 * Adds number of lines to top and bottom when `followCursor` is `activeLine`.
	 * Adds number of closest problems when `followCursor` is `closestProblem`
	 */
	followCursorMore: number;
	/**
	 * Update decorations only on save
	 */
	onSave: boolean;
	/**
	 * Time period that used for showing decorations after the document save.
	 */
	onSaveTimeout: number;
	/**
	 * Prevent scrollbars from appearing for decorations.
	 */
	scrollbarHackEnabled: boolean;
	/**
	 * When enabled - replaces line breaks in inline diagnostic message with `⏎` sign.
	 */
	removeLinebreaks: boolean;

	gutterIconsEnabled: boolean;
	gutterIconsFollowCursorOverride: boolean;
	gutterIconSize: string;
	gutterIconSet: GutterIconSet;

	errorGutterIconPath?: string;
	warningGutterIconPath?: string;
	infoGutterIconPath?: string;

	errorGutterIconColor: string;
	warningGutterIconColor: string;
	infoGutterIconColor: string;
}

export type GutterIconSet = 'borderless' | 'circle' | 'default' | 'defaultOutline';
export type FollowCursor = 'activeLine' | 'allLines' | 'closestProblem';

export interface AggregatedByLineDiagnostics {
	[lineNumber: string]: vscode.Diagnostic[];
}

export interface Gutter {
	iconSet: GutterIconSet;

	errorIconPath: string;
	errorIconPathLight: string;

	warningIconPath: string;
	warningIconPathLight: string;

	infoIconPath: string;
	infoIconPathLight: string;
}

export const enum CommandIds {
	toggle = 'errorLens.toggle',
	toggleError = 'errorLens.toggleError',
	toggleWarning = 'errorLens.toggleWarning',
	toggleInfo = 'errorLens.toggleInfo',
	toggleHint = 'errorLens.toggleHint',
	copyProblemMessage = 'errorLens.copyProblemMessage',
	statusBarCommand = 'errorLens.statusBarCommand',
}

export const enum Constants {
	EXTENSION_NAME = 'errorLens',
}
