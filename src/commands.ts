import { $config, Global } from 'src/extension';
import { toggleEnabledLevels, updateGlobalSetting } from 'src/settings';
import { AggregatedByLineDiagnostics, CommandIds } from 'src/types';
import { commands, env, ExtensionContext, languages, Range, Selection, TextEditorRevealType, window, workspace } from 'vscode';
/**
 * Register all commands contributed by this extension.
 */
export function registerAllCommands(extensionContext: ExtensionContext) {
	const disposableToggleErrorLens = commands.registerCommand(CommandIds.toggle, () => {
		updateGlobalSetting('errorLens.enabled', !$config.enabled);
	});
	const disposableToggleError = commands.registerCommand(CommandIds.toggleError, () => {
		toggleEnabledLevels('error', $config.enabledDiagnosticLevels);
	});
	const disposableToggleWarning = commands.registerCommand(CommandIds.toggleWarning, () => {
		toggleEnabledLevels('warning', $config.enabledDiagnosticLevels);
	});
	const disposableToggleInfo = commands.registerCommand(CommandIds.toggleInfo, () => {
		toggleEnabledLevels('info', $config.enabledDiagnosticLevels);
	});
	const disposableToggleHint = commands.registerCommand(CommandIds.toggleHint, () => {
		toggleEnabledLevels('hint', $config.enabledDiagnosticLevels);
	});

	const disposableCopyProblemMessage = commands.registerTextEditorCommand(CommandIds.copyProblemMessage, editor => {
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

	const disposableStatusBarCommand = commands.registerTextEditorCommand(CommandIds.statusBarCommand, async editor => {
		if ($config.statusBarCommand === 'goToLine' || $config.statusBarCommand === 'goToProblem') {
			const range = new Range(Global.statusBarMessage.activeMessagePosition, Global.statusBarMessage.activeMessagePosition);
			editor.selection = new Selection(range.start, range.end);
			editor.revealRange(range, TextEditorRevealType.Default);
			await commands.executeCommand('workbench.action.focusActiveEditorGroup');

			if ($config.statusBarCommand === 'goToProblem') {
				commands.executeCommand('editor.action.marker.next');
			}
		} else if ($config.statusBarCommand === 'copyMessage') {
			const source = Global.statusBarMessage.activeMessageSource ? `[${Global.statusBarMessage.activeMessageSource}] ` : '';
			env.clipboard.writeText(source + Global.statusBarMessage.activeMessageText);
		}
	});

	const disposableRevealLine = commands.registerCommand(CommandIds.revealLine, async (fsPath: string, [line, char]) => {
		const range = new Range(line, char, line, char);
		const document = await workspace.openTextDocument(fsPath);
		const editor = await window.showTextDocument(document);
		editor.revealRange(range);
		editor.selection = new Selection(range.start.line, range.start.character, range.start.line, range.start.character);
	});

	extensionContext.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage, disposableStatusBarCommand, disposableRevealLine);
}

