import { $config } from 'src/extension';
import { Constants, type ExtensionConfig } from 'src/types';
import { extensionUtils } from 'src/utils/extensionUtils';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { window, type Diagnostic } from 'vscode';

export async function excludeProblemCommand(diagnostic: Diagnostic): Promise<void> {
	const code = extensionUtils.getDiagnosticCode(diagnostic);
	const source = diagnostic.source;
	if (!source) {
		window.showWarningMessage('Diagnostic has no "source".');
		return;
	}
	if (!code) {
		window.showErrorMessage('Diagnostic has no "code".');
		return;
	}

	const sourceCodeString = extensionUtils.diagnosticToSourceCodeString(source, code);

	if ($config.excludeBySource.includes(sourceCodeString)) {
		return;
	}

	await vscodeUtils.updateGlobalSetting(`${Constants.SettingsPrefix}.${'excludeBySource' satisfies keyof ExtensionConfig}`, [
		...$config.excludeBySource,
		sourceCodeString,
	]);

	showCompletionNotification(sourceCodeString);
}

async function showCompletionNotification(sourceCodeString: string): Promise<void> {
	const openSettingsButton = 'Open Setting';
	const pressedButton = await window.showInformationMessage(`Excluded problem by source+code: "${sourceCodeString}"`, openSettingsButton);

	if (pressedButton === openSettingsButton) {
		vscodeUtils.openSettingGuiAt(`@ext:${Constants.ExtensionId} ${'excludeBySource' satisfies keyof ExtensionConfig}`);
	}
}
