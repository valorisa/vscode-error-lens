import { ExtensionConfig } from 'src/types';
import { ConfigurationTarget, workspace } from 'vscode';

export function updateGlobalSetting(settingId: string, newValue: unknown) {
	const config = workspace.getConfiguration();
	config.update(settingId, newValue, ConfigurationTarget.Global);
}

export function toggleEnabledLevels(severity: ExtensionConfig['enabledDiagnosticLevels'][number], arrayValue: ExtensionConfig['enabledDiagnosticLevels']) {
	const oldValueIndex = arrayValue.indexOf(severity);
	if (oldValueIndex !== -1) {
		arrayValue.splice(oldValueIndex, 1);
	} else {
		arrayValue.push(severity);
	}
	updateGlobalSetting('errorLens.enabledDiagnosticLevels', arrayValue);
}
