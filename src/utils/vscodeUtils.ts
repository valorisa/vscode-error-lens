import { ConfigurationTarget, Uri, commands, workspace } from 'vscode';

/**
 * Update global settings.json file with the new settign value.
 */
async function updateGlobalSetting(settingId: string, newValue: unknown): Promise<void> {
	const vscodeConfig = workspace.getConfiguration();
	await vscodeConfig.update(settingId, newValue, ConfigurationTarget.Global);
}

/**
 * Transform string svg to {@link Uri}
 */
function svgToUri(svg: string): Uri {
	return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
}

/**
 * Open vscode Settings GUI with input value set to the specified value.
 */
async function openSettingGuiAt(settingName: string): Promise<void> {
	await commands.executeCommand('workbench.action.openSettings', settingName);
}

export const vscodeUtils = {
	updateGlobalSetting,
	svgToUri,
	openSettingGuiAt,
};
