import { $config, Global } from 'src/extension';
import { toggleEnabledLevels, toggleWorkspace, updateGlobalSetting } from 'src/settings';
import { Constants, type AggregatedByLineDiagnostics } from 'src/types';
import { commands, env, languages, Range, Selection, TextEditorRevealType, window, workspace, type ExtensionContext } from 'vscode';

/**
 * All command ids contributed by this extensions.
 */
export const enum CommandId {
	Toggle = 'errorLens.toggle',
	ToggleError = 'errorLens.toggleError',
	ToggleWarning = 'errorLens.toggleWarning',
	ToggleInfo = 'errorLens.toggleInfo',
	ToggleHint = 'errorLens.toggleHint',
	ToggleWorkspace = 'errorlens.toggleWorkspace',
	CopyProblemMessage = 'errorLens.copyProblemMessage',
	StatusBarCommand = 'errorLens.statusBarCommand',
	RevealLine = 'errorLens.revealLine',
}

/**
 * Register all commands contributed by this extension.
 */
export function registerAllCommands(extensionContext: ExtensionContext): void {
	const disposableToggleErrorLens = commands.registerCommand(CommandId.Toggle, () => {
		updateGlobalSetting('errorLens.enabled', !$config.enabled);
	});
	const disposableToggleError = commands.registerCommand(CommandId.ToggleError, () => {
		toggleEnabledLevels('error', $config.enabledDiagnosticLevels);
	});
	const disposableToggleWarning = commands.registerCommand(CommandId.ToggleWarning, () => {
		toggleEnabledLevels('warning', $config.enabledDiagnosticLevels);
	});
	const disposableToggleInfo = commands.registerCommand(CommandId.ToggleInfo, () => {
		toggleEnabledLevels('info', $config.enabledDiagnosticLevels);
	});
	const disposableToggleHint = commands.registerCommand(CommandId.ToggleHint, () => {
		toggleEnabledLevels('hint', $config.enabledDiagnosticLevels);
	});
	const disposableToggleWorkspace = commands.registerCommand(CommandId.ToggleWorkspace, () => {
		toggleWorkspace();
	});

	const disposableCopyProblemMessage = commands.registerTextEditorCommand(CommandId.CopyProblemMessage, editor => {
		const aggregatedDiagnostics: AggregatedByLineDiagnostics = {};
		for (const diagnostic of languages.getDiagnostics(editor.document.uri)) {
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
		env.clipboard.writeText(source + renderedDiagnostic.message);
	});

	const disposableStatusBarCommand = commands.registerTextEditorCommand(CommandId.StatusBarCommand, async editor => {
		if ($config.statusBarCommand === 'goToLine' || $config.statusBarCommand === 'goToProblem') {
			const range = new Range(Global.statusBarMessage.activeMessagePosition, Global.statusBarMessage.activeMessagePosition);
			editor.selection = new Selection(range.start, range.end);
			editor.revealRange(range, TextEditorRevealType.Default);
			await commands.executeCommand(Constants.FocusActiveEditorCommandId);

			if ($config.statusBarCommand === 'goToProblem') {
				commands.executeCommand(Constants.NextProblemCommandId);
			}
		} else if ($config.statusBarCommand === 'copyMessage') {
			const source = Global.statusBarMessage.activeMessageSource ? `[${Global.statusBarMessage.activeMessageSource}] ` : '';
			env.clipboard.writeText(source + Global.statusBarMessage.activeMessageText);
		}
	});

	const disposableRevealLine = commands.registerCommand(CommandId.RevealLine, async (fsPath: string, [line, char]: [number, number]) => {
		const range = new Range(line, char, line, char);
		const document = await workspace.openTextDocument(fsPath);
		const editor = await window.showTextDocument(document);
		editor.revealRange(range);
		editor.selection = new Selection(range.start.line, range.start.character, range.start.line, range.start.character);
	});

	extensionContext.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage, disposableStatusBarCommand, disposableRevealLine, disposableToggleWorkspace);
}

