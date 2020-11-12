import { updateAllDecorations } from 'src/decorations';
import { disposeEverything, EXTENSION_NAME, Global, updateEverything } from 'src/extension';
import { AggregatedByLineDiagnostics } from 'src/types';
import vscode, { commands, ExtensionContext, window } from 'vscode';

export function registerAllCommands(extensionContext: ExtensionContext): void {
	const disposableToggleErrorLens = commands.registerCommand(`${EXTENSION_NAME}.toggle`, () => {
		Global.errorLensEnabled = !Global.errorLensEnabled;

		if (Global.errorLensEnabled) {
			updateEverything();
		} else {
			disposeEverything();
		}
	});
	const disposableToggleError = commands.registerCommand(`${EXTENSION_NAME}.toggleError`, () => {
		Global.errorEnabled = !Global.errorEnabled;
		updateAllDecorations();
	});
	const disposableToggleWarning = commands.registerCommand(`${EXTENSION_NAME}.toggleWarning`, () => {
		Global.warningEabled = !Global.warningEabled;
		updateAllDecorations();
	});
	const disposableToggleInfo = commands.registerCommand(`${EXTENSION_NAME}.toggleInfo`, () => {
		Global.infoEnabled = !Global.infoEnabled;
		updateAllDecorations();
	});
	const disposableToggleHint = commands.registerCommand(`${EXTENSION_NAME}.toggleHint`, () => {
		Global.hintEnabled = !Global.hintEnabled;
		updateAllDecorations();
	});

	const disposableCopyProblemMessage = commands.registerTextEditorCommand(`${EXTENSION_NAME}.copyProblemMessage`, editor => {
		const aggregatedDiagnostics: AggregatedByLineDiagnostics = {};
		for (const diagnostic of vscode.languages.getDiagnostics(editor.document.uri)) {
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
		vscode.env.clipboard.writeText(source + renderedDiagnostic.message);
	});

	extensionContext.subscriptions.push(disposableToggleErrorLens, disposableToggleError, disposableToggleWarning, disposableToggleInfo, disposableToggleHint, disposableCopyProblemMessage);
}

