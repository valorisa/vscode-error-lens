import { Diagnostic } from 'vscode';

export type ExtensionConfig = Readonly<{
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
	/**
	 * Font family of inline message.
	 */
	fontFamily: string;
	/**
	 * Font weight of inline message.
	 */
	fontWeight: string;
	/**
	 * Font size of inline message
	 */
	fontSize: string;
	/**
	 * When enabled - shows inline message in italic font style.
	 */
	fontStyleItalic: boolean;
	/**
	 * Distance between the last word on the line and the start of inline message.
	 */
	margin: string;
	/**
	 * Inner margin of the inline message.
	 */
	padding: string;
	/**
	 * Border radius of the inline message.
	 */
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
	/**
	 * Whether to show status bar item or not. Default is **false**.
	 */
	statusBarMessageEnabled: boolean;
	/**
	 * Pick what to show in Status Bar: closest message or only message for the active line.
	 */
	statusBarMessageType: 'activeLine' | 'closestProblem' | 'closestSeverity';
	/**
	 * Whether to use color for status bar items or not.
	 */
	statusBarColorsEnabled: boolean;
	/**
	 * Command to execute when clicking on status bar item.
	 */
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
	 * Time period that used for showing decorations after the document save (manual).
	 */
	onSaveTimeout: number;
	/**
	 * Prevent scrollbars from appearing for decorations.
	 */
	scrollbarHackEnabled: boolean;
	/**
	 * When enabled - replaces line breaks in inline diagnostic message with the whitespace ` ` sign.
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
}>;

export type GutterIconSet = 'borderless' | 'circle' | 'default' | 'defaultOutline';
export type FollowCursor = 'activeLine' | 'allLines' | 'closestProblem';

export interface AggregatedByLineDiagnostics {
	[lineNumber: string]: Diagnostic[];
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
/**
 * All command ids contributed by this extensions.
 */
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
	/**
	 * Not really this extension's name. In `package.json` it's `errorlens`.
	 *
	 * Extension id is derived from it: `usernamehw.errorlens`.
	 *
	 * But `errorLens` is used as a prefix for commands, settings, colors (everything, basically).
	 */
	EXTENSION_NAME = 'errorLens',
}
