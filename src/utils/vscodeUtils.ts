import { ConfigurationTarget, Uri, workspace } from 'vscode';

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

export const vscodeUtils = {
	updateGlobalSetting,
	svgToUri,
};
