import { updateDecorationsForAllVisibleEditors } from 'src/decorations';
import { disposeEverything, extensionConfig, Global, updateEverything } from 'src/extension';
import { AggregatedByLineDiagnostics, CommandIds } from 'src/types';
import { commands, env, ExtensionContext, languages, Range, Selection, TextEditorRevealType, window } from 'vscode';
/**
 * Register all commands contributed by this extension.
 */
export function registerAllCommands(extensionContext: ExtensionContext) {
	const disposableToggleErrorLens = commands.registerCommand(CommandIds.toggle, () => {
		Global.errorLensEnabled = !Global.errorLensEnabled;

		if (Global.errorLensEnabled) {
			updateEverything();
		} else {
			disposeEverything();
		}
	});
	const disposableToggleError = commands.registerCommand(CommandIds.toggleError, () => {
		Global.errorEnabled = !Global.errorEnabled;
		updateDecorationsForAllVisibleEditors();
	});
	const disposableToggleWarning = commands.registerCommand(CommandIds.toggleWarning, () => {
		Global.warningEabled = !Global.warningEabled;
		updateDecorationsForAllVisibleEditors();
	});
	const disposableToggleInfo = commands.registerCommand(CommandIds.toggleInfo, () => {
		Global.infoEnabled = !Global.infoEnabled;
		updateDecorationsForAllVisibleEditors();
	});
	const disposableToggleHint = commands.registerCommand(CommandIds.toggleHint, () => {
		Global.hintEnabled = !Global.hintEnabled;
		updateDecorationsForAllVisibleEditors();
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
		if (extensionConfig.statusBarCommand === 'goToLine' || extensionConfig.statusBarCommand === 'goToProblem') {
			const range = new Range(Global.statusBar.activeMessagePosition, Global.statusBar.activeMessagePosition);
			editor.selection = new Selection(range.start, range.end);
			editor.revealRange(range, TextEditorRevealType.Default);
			await commands.executeCommand('workbench.action.focusActiveEditorGroup');

			if (extensionConfig.statusBarCommand === 'goToProblem') {
				commands.executeCommand('editor.action.marker.next');
			}
		} else if (extensionConfig.statusBarCommand === 'copyMessage') {
			const source = Global.statusBar.activeMessageSource ? `[${Global.statusBar.activeMessageSource}] ` : '';
			env.clipboard.writeText(source + Global.statusBar.activeMessageText);
		}
	});

	extensionContext.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage, disposableStatusBarCommand);
}

