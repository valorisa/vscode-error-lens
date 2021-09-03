import { Diagnostic, Uri } from 'vscode';

interface ExtensionConfigType {
	/** If extension is enabled. */
	enabled: boolean;
	/** Font family of inline message. */
	fontFamily: string;
	/** Font weight of inline message. */
	fontWeight: string;
	/** Font size of inline message. */
	fontSize: string;
	/** When enabled - shows inline message in italic font style. */
	fontStyleItalic: boolean;
	/** Distance between the last word on the line and the start of inline message. */
	margin: string;
	/** Inner margin of the inline message. */
	padding: string;
	/** Border radius of the inline message. */
	borderRadius: string;
	/** Controls whether inline message is shown or not (Including background highlight). */
	messageEnabled: boolean;
	/** Choose which levels of diagnostics to highlight. */
	enabledDiagnosticLevels: ('error' | 'hint' | 'info' | 'warning')[];
	/** Template used for all inline messages. Interpolates `$message`, `$source`, `$code`, `$count`, `$severity`. */
	messageTemplate: string;
	/** Cut off inline message if it's longer than this value. */
	messageMaxChars: number;
	/** Replaces `$severity` variable in `#errorLens.messageTemplate#`. */
	severityText: string[];
	/** Array of diagnostic messages that should not be decorated. Matches against `Diagnostic.message`. */
	exclude: string[];
	/** Specify sources that should not be highlighted (string). */
	excludeBySource: string[];
	/** Glob matching files that should not be decorated. Matches against absolute file path. */
	excludePatterns: string[];
	/** When enabled - shows highlighted error/warning icons in status bar. */
	statusBarIconsEnabled: boolean;
	/** When enabled - highlights status bar icons with background, when disabled - with foreground. */
	statusBarIconsUseBackground: boolean;
	/** What to do when there are 0 errors/warnings - hide the item or strip its background color. */
	statusBarIconsAtZero: 'hide' | 'removeBackground';
	/** Whether to show status bar item or not. Default is **false**. */
	statusBarMessageEnabled: boolean;
	/** Pick what to show in Status Bar: closest message or only message for the active line. */
	statusBarMessageType: 'activeLine' | 'closestProblem' | 'closestSeverity';
	/** Whether to use color for status bar items or not. */
	statusBarColorsEnabled: boolean;
	/** Command to execute when clicking on status bar item. */
	statusBarCommand: 'copyMessage' | 'goToLine' | 'goToProblem';
	/** See `#errorLens.messageTemplate#`. */
	statusBarMessageTemplate: string;
	/** Adds delay before showing diagnostic. */
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
	/** Update decorations only on save. */
	onSave: boolean;
	/** Time period that used for showing decorations after the document save (manual). */
	onSaveTimeout: number;
	/** Prevent scrollbars from appearing for decorations. */
	scrollbarHackEnabled: boolean;
	/** When enabled - replaces line breaks in inline diagnostic message with the whitespace ` ` sign. */
	removeLinebreaks: boolean;

	gutterIconsEnabled: boolean;
	gutterIconsFollowCursorOverride: boolean;
	gutterIconSize: string;
	gutterIconSet: GutterIconSet;

	errorGutterIconPath: string;
	warningGutterIconPath: string;
	infoGutterIconPath: string;

	errorGutterIconColor: string;
	warningGutterIconColor: string;
	infoGutterIconColor: string;
	/** Overwrite gutter items for light theme */
	light: {
		errorGutterIconPath: string;
		warningGutterIconPath: string;
		infoGutterIconPath: string;

		errorGutterIconColor: string;
		warningGutterIconColor: string;
		infoGutterIconColor: string;
	};
}

export type ExtensionConfig = Readonly<ExtensionConfigType>;

export type GutterIconSet = 'borderless' | 'circle' | 'default' | 'defaultOutline';
export type FollowCursor = 'activeLine' | 'allLines' | 'closestProblem';

export interface AggregatedByLineDiagnostics {
	[lineNumber: string]: Diagnostic[];
}

export interface Gutter {
	iconSet: GutterIconSet;

	errorIconPath: Uri | string;
	errorIconPathLight: Uri | string;

	warningIconPath: Uri | string;
	warningIconPathLight: Uri | string;

	infoIconPath: Uri | string;
	infoIconPathLight: Uri | string;
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
	revealLine = 'errorLens.revealLine',
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
	openProblemsViewId = 'workbench.actions.view.problems',
}
