import { $config } from 'src/extension';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { window, workspace } from 'vscode';

export function toggleWorkspaceCommand(): void {
	const activeTextEditor = window.activeTextEditor;

	if (!activeTextEditor) {
		// TODO: maybe show button to use/pick workspace in that case
		window.showWarningMessage('No acitive text editor.');
		return;
	}

	const currentWorkspacePath = workspace.getWorkspaceFolder(activeTextEditor.document.uri)?.uri.fsPath;

	if (!currentWorkspacePath) {
		window.showWarningMessage(`Counldn't find workspace folder for "${activeTextEditor.document.uri.toString()}".`);
		return;
	}

	let newExcludeWorkspaceList: string[];

	if ($config.excludeWorkspaces?.includes(currentWorkspacePath)) {
		newExcludeWorkspaceList = $config.excludeWorkspaces.filter(workspacePath => workspacePath !== currentWorkspacePath);
		window.showInformationMessage(`Included: "${currentWorkspacePath}"`);
	} else {
		newExcludeWorkspaceList = [...($config.excludeWorkspaces || []), currentWorkspacePath];
		window.showInformationMessage(`Excluded: "${currentWorkspacePath}"`);
	}

	vscodeUtils.updateGlobalSetting('errorLens.excludeWorkspaces', newExcludeWorkspaceList);
}
