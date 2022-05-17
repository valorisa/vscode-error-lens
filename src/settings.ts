import { ExtensionConfig } from 'src/types';
import { ConfigurationTarget, workspace } from 'vscode';

/**
 * Update global settings.json file with the new settign value.
 */
export function updateGlobalSetting(settingId: string, newValue: unknown): void {
	const config = workspace.getConfiguration();
	config.update(settingId, newValue, ConfigurationTarget.Global);
}
/**
 * Update global setting `errorLens.enabledDiagnosticLevels`.
 * Either add a diagnostic severity or remove it.
 */
export function toggleEnabledLevels(
	severity: ExtensionConfig['enabledDiagnosticLevels'][number],
	arrayValue: ExtensionConfig['enabledDiagnosticLevels'],
): void {
	const oldValueIndex = arrayValue.indexOf(severity);
	if (oldValueIndex !== -1) {
		arrayValue.splice(oldValueIndex, 1);
	} else {
		arrayValue.push(severity);
	}
	updateGlobalSetting('errorLens.enabledDiagnosticLevels', arrayValue);
}
