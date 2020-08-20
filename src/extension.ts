import { registerAllCommands } from 'src/commands';
import { CustomDelay } from 'src/CustomDelay';
import { setDecorationStyle, updateAllDecorations } from 'src/decorations';
import { updateChangedActiveTextEditorListener, updateChangeDiagnosticListener, updateChangeVisibleTextEditorsListener, updateCursorChangeListener, updateOnSaveListener } from 'src/eventListeners';
import { createStatusBarItem } from 'src/statusBar';
import { ExtensionConfig } from 'src/types';
import vscode, { ExtensionContext, workspace } from 'vscode';

export const EXTENSION_NAME = 'errorLens';
export let extensionConfig: ExtensionConfig;

/**
 * Global variables
 */
export class Global {
	static errorLensEnabled = true;
	static errorEnabled = true;
	static warningEabled = true;
	static infoEnabled = true;
	static hintEnabled = true;

	static configErrorEnabled = true;
	static configWarningEnabled = true;
	static configInfoEnabled = true;
	static configHintEnabled = true;

	static decorationRenderOptionsError: vscode.DecorationRenderOptions;
	static decorationRenderOptionsWarning: vscode.DecorationRenderOptions;
	static decorationRenderOptionsInfo: vscode.DecorationRenderOptions;
	static decorationRenderOptionsHint: vscode.DecorationRenderOptions;

	static decorationTypeError: vscode.TextEditorDecorationType;
	static decorationTypeWarning: vscode.TextEditorDecorationType;
	static decorationTypeInfo: vscode.TextEditorDecorationType;
	static decorationTypeHint: vscode.TextEditorDecorationType;
	static decorationTypeGutterError: vscode.TextEditorDecorationType;
	static decorationTypeGutterWarning: vscode.TextEditorDecorationType;
	static decorationTypeGutterInfo: vscode.TextEditorDecorationType;

	static onDidChangeDiagnosticsDisposable: vscode.Disposable | undefined;
	static onDidChangeActiveTextEditor: vscode.Disposable | undefined;
	static onDidChangeVisibleTextEditors: vscode.Disposable | undefined;
	static onDidSaveTextDocumentDisposable: vscode.Disposable | undefined;
	static onDidCursorChangeDisposable: vscode.Disposable | undefined;

	static statusBarItem: vscode.StatusBarItem;
	static statusBarColors: vscode.ThemeColor[] = [];

	static renderGutterIconsAsSeparateDecoration: boolean;
	static excludeRegexp: RegExp[] = [];
	static excludePatterns?: {
		pattern: string;
	}[] = undefined;
	static lastSavedTimestamp = Date.now() + 2000;
	static customDelay: undefined | CustomDelay;

	static extensionContext: ExtensionContext;
}

export function activate(extensionContext: ExtensionContext): void {
	Global.extensionContext = extensionContext;
	updateConfigAndEverything();
	registerAllCommands(extensionContext);

	function onConfigChange(e: vscode.ConfigurationChangeEvent): void {
		if (!e.affectsConfiguration(EXTENSION_NAME)) {
			return;
		}
		updateConfigAndEverything();
	}

	function updateConfigAndEverything(): void {
		extensionConfig = workspace.getConfiguration(EXTENSION_NAME) as any as ExtensionConfig;
		disposeEverything();
		updateEverything();
	}

	extensionContext.subscriptions.push(workspace.onDidChangeConfiguration(onConfigChange));
}

export function updateEverything(): void {
	updateExclude();
	Global.renderGutterIconsAsSeparateDecoration = extensionConfig.gutterIconsEnabled && extensionConfig.gutterIconsFollowCursorOverride && extensionConfig.followCursor !== 'allLines';
	setDecorationStyle();
	createStatusBarItem();
	updateConfigEnabledLevels();

	updateAllDecorations();

	updateChangeDiagnosticListener();
	updateChangeVisibleTextEditorsListener();
	updateOnSaveListener();
	updateCursorChangeListener();
	updateChangedActiveTextEditorListener();
}

function updateExclude(): void {
	Global.excludeRegexp = [];

	for (const item of extensionConfig.exclude) {
		if (typeof item === 'string') {
			Global.excludeRegexp.push(new RegExp(item, 'i'));
		}
	}
	if (Array.isArray(extensionConfig.excludePatterns) && extensionConfig.excludePatterns.length !== 0) {
		Global.excludePatterns = extensionConfig.excludePatterns.map(item => ({
			pattern: item,
		}));
	} else {
		Global.excludePatterns = undefined;
	}
}

function updateConfigEnabledLevels(): void {
	Global.configErrorEnabled = extensionConfig.enabledDiagnosticLevels.includes('error');
	Global.configWarningEnabled = extensionConfig.enabledDiagnosticLevels.includes('warning');
	Global.configInfoEnabled = extensionConfig.enabledDiagnosticLevels.includes('info');
	Global.configHintEnabled = extensionConfig.enabledDiagnosticLevels.includes('hint');
}

export function disposeEverything(): void {
	if (Global.decorationTypeError) {
		Global.decorationTypeError.dispose();
	}
	if (Global.decorationTypeWarning) {
		Global.decorationTypeWarning.dispose();
	}
	if (Global.decorationTypeInfo) {
		Global.decorationTypeInfo.dispose();
	}
	if (Global.decorationTypeHint) {
		Global.decorationTypeHint.dispose();
	}
	if (Global.decorationTypeGutterError) {
		Global.decorationTypeGutterError.dispose();
	}
	if (Global.decorationTypeGutterWarning) {
		Global.decorationTypeGutterWarning.dispose();
	}
	if (Global.decorationTypeGutterInfo) {
		Global.decorationTypeGutterInfo.dispose();
	}
	if (Global.onDidChangeVisibleTextEditors) {
		Global.onDidChangeVisibleTextEditors.dispose();
	}
	if (Global.onDidChangeDiagnosticsDisposable) {
		Global.onDidChangeDiagnosticsDisposable.dispose();
	}
	if (Global.onDidChangeActiveTextEditor) {
		Global.onDidChangeActiveTextEditor.dispose();
	}
	if (Global.onDidSaveTextDocumentDisposable) {
		Global.onDidSaveTextDocumentDisposable.dispose();
	}
	if (Global.onDidCursorChangeDisposable) {
		Global.onDidCursorChangeDisposable.dispose();
	}
	if (Global.statusBarItem) {
		Global.statusBarItem.dispose();
	}
}

export function deactivate(): void { }
