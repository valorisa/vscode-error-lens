import { registerAllCommands } from 'src/commands';
import { type CustomDelay } from 'src/CustomDelay';
import { setDecorationStyle, updateDecorationsForAllVisibleEditors } from 'src/decorations';
import { updateChangedActiveTextEditorListener, updateChangeDiagnosticListener, updateChangeVisibleTextEditorsListener, updateCursorChangeListener, updateOnSaveListener } from 'src/eventListeners';
import { StatusBarIcons } from 'src/statusBarIcons';
import { StatusBarMessage } from 'src/statusBarMessage';
import { Constants, type ExtensionConfig } from 'src/types';
import { workspace, type Disposable, type ExtensionContext, type TextEditorDecorationType } from 'vscode';

/**
 * All user settings.
 */
export let $config: ExtensionConfig;

/**
 * Global variables.
 */
export abstract class Global {
	public static configErrorEnabled = true;
	public static configWarningEnabled = true;
	public static configInfoEnabled = true;
	public static configHintEnabled = true;

	public static decorationTypeError: TextEditorDecorationType;
	public static decorationTypeWarning: TextEditorDecorationType;
	public static decorationTypeInfo: TextEditorDecorationType;
	public static decorationTypeHint: TextEditorDecorationType;
	public static decorationTypeGutterError: TextEditorDecorationType;
	public static decorationTypeGutterWarning: TextEditorDecorationType;
	public static decorationTypeGutterInfo: TextEditorDecorationType;

	public static onDidChangeDiagnosticsDisposable: Disposable | undefined;
	public static onDidChangeActiveTextEditor: Disposable | undefined;
	public static onDidChangeVisibleTextEditors: Disposable | undefined;
	public static onDidSaveTextDocumentDisposable: Disposable | undefined;
	public static onDidCursorChangeDisposable: Disposable | undefined;
	/**
	 * Status bar object. Handles all status bar stuff (for text message)
	 */
	public static statusBarMessage: StatusBarMessage;
	/**
	 * Status bar object. Handles all status bar stuff (for icons)
	 */
	public static statusBarIcons: StatusBarIcons;
	/**
	 * Editor icons can be rendered only for active line (to reduce the visual noise).
	 * But it might be useful to show gutter icons for all lines. With `gutterIconsFollowCursorOverride`
	 * setting then gutter icons will be rendered as a separate set of decorations.
	 */
	public static renderGutterIconsAsSeparateDecoration: boolean;
	/**
	 * Array of RegExp (that would match against diagnostic message)
	 */
	public static excludeRegexp: RegExp[] = [];
	/**
	 * Array of source/code to ignore (that would match against diagnostic object)
	 */
	public static excludeSources: {
		source: string;
		code?: string;
	}[] = [];

	/**
	 * Array of document selectors (that would match against document)
	 */
	public static excludePatterns?: {
		pattern: string;
	}[] = undefined;

	/**
	 * Timestamp when last time user manually saved the document.
	 * Used to determine if the save was recently (1s?) to show decorations.
	 */
	public static lastSavedTimestamp = Date.now() + 2000;
	/**
	 * CustomDelay object. Handles updating decorations with a delay.
	 */
	public static customDelay: CustomDelay | undefined;
}

export function activate(context: ExtensionContext): void {
	updateConfigAndEverything();
	registerAllCommands(context);

	/**
	 * - Update config
	 * - Dispose everything
	 * - Update everything
	 */
	function updateConfigAndEverything(): void {
		$config = workspace.getConfiguration().get(Constants.SettingsPrefix)!;
		disposeEverything();
		if ($config.enabled) {
			updateEverything(context);
		}
	}

	context.subscriptions.push(workspace.onDidChangeConfiguration(e => {
		if (!e.affectsConfiguration(Constants.SettingsPrefix)) {
			return;
		}
		updateConfigAndEverything();
	}));
}
/**
 * - Update all global variables
 * - Update all decoration styles
 * - Update decorations for all visible editors
 * - Update all event listeners
 */
export function updateEverything(context: ExtensionContext): void {
	updateExclude();
	Global.renderGutterIconsAsSeparateDecoration = $config.gutterIconsEnabled &&
		$config.gutterIconsFollowCursorOverride &&
		$config.followCursor !== 'allLines';
	Global.statusBarMessage?.dispose();
	Global.statusBarIcons?.dispose();
	Global.statusBarMessage = new StatusBarMessage({
		isEnabled: $config.statusBarMessageEnabled,
		colorsEnabled: $config.statusBarColorsEnabled,
		messageType: $config.statusBarMessageType,
		priority: $config.statusBarMessagePriority,
		alignment: $config.statusBarMessageAlignment,
	});
	Global.statusBarIcons = new StatusBarIcons({
		isEnabled: $config.statusBarIconsEnabled,
		atZero: $config.statusBarIconsAtZero,
		useBackground: $config.statusBarIconsUseBackground,
		priority: $config.statusBarIconsPriority,
		alignment: $config.statusBarIconsAlignment,
	});
	setDecorationStyle(context);
	updateConfigEnabledLevels();

	updateDecorationsForAllVisibleEditors();

	Global.statusBarIcons.updateText();

	updateChangeDiagnosticListener();
	updateChangeVisibleTextEditorsListener();
	updateOnSaveListener();
	updateCursorChangeListener();
	updateChangedActiveTextEditorListener();
}
/**
 * - Create `RegExp` from string for messages.
 * - Create `DocumentFilter[]` for document match.
 * - Create `source/code` exclusion object.
 */
function updateExclude(): void {
	Global.excludeRegexp = [];
	Global.excludeSources = [];

	for (const excludeSourceCode of $config.excludeBySource) {
		// Match source/code like:  eslint(padded-blocks)
		const sourceCodeMatch = /(?<source>[^()]+)(?:\((?<code>.+)\))?/u.exec(excludeSourceCode);
		const source = sourceCodeMatch?.groups?.source;
		const code = sourceCodeMatch?.groups?.code;
		if (!source) {
			continue;
		}
		Global.excludeSources.push({
			source,
			code,
		});
	}

	for (const excludeMessage of $config.exclude) {
		if (typeof excludeMessage === 'string') {
			Global.excludeRegexp.push(new RegExp(excludeMessage, 'iu'));
		}
	}
	if (Array.isArray($config.excludePatterns) && $config.excludePatterns.length !== 0) {
		Global.excludePatterns = $config.excludePatterns.map(item => ({
			pattern: item,
		}));
	} else {
		Global.excludePatterns = undefined;
	}
}
/**
 * Update global varialbes for enabled severity levels of diagnostics based on user setting `enabledDiagnosticLevels`.
 */
function updateConfigEnabledLevels(): void {
	Global.configErrorEnabled = $config.enabledDiagnosticLevels.includes('error');
	Global.configWarningEnabled = $config.enabledDiagnosticLevels.includes('warning');
	Global.configInfoEnabled = $config.enabledDiagnosticLevels.includes('info');
	Global.configHintEnabled = $config.enabledDiagnosticLevels.includes('hint');
}
/**
 * Dispose all known disposables (except `onDidChangeConfiguration`).
 */
export function disposeEverything(): void {
	Global.decorationTypeError?.dispose();
	Global.decorationTypeWarning?.dispose();
	Global.decorationTypeInfo?.dispose();
	Global.decorationTypeHint?.dispose();
	Global.decorationTypeGutterError?.dispose();
	Global.decorationTypeGutterWarning?.dispose();
	Global.decorationTypeGutterInfo?.dispose();
	Global.onDidChangeVisibleTextEditors?.dispose();
	Global.onDidChangeDiagnosticsDisposable?.dispose();
	Global.onDidChangeActiveTextEditor?.dispose();
	Global.onDidSaveTextDocumentDisposable?.dispose();
	Global.onDidCursorChangeDisposable?.dispose();
	Global.statusBarMessage?.dispose();
	Global.statusBarIcons?.dispose();
}

export function deactivate(): void { }
