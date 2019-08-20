import vscode, { workspace } from 'vscode';

interface IColorCustomizations {
	[key: string]: string;
}

export function getWorkspaceColorCustomizations(): IColorCustomizations {
	const inspect = workspace.getConfiguration().inspect('workbench.colorCustomizations');

	if (!inspect) {
		return {};
	}
	if (typeof inspect.workspaceValue !== 'object') {
		return {};
	}
	const colorCustomizations: IColorCustomizations = inspect.workspaceValue as IColorCustomizations;

	return colorCustomizations;
}
export function updateWorkspaceColorCustomizations(newValue = {}): void {
	const settings = workspace.getConfiguration(undefined, null);
	settings.update('workbench.colorCustomizations', newValue, vscode.ConfigurationTarget.Workspace);
}
export function removeActiveTabDecorations(): void {
	const workspaceColorCustomizations = getWorkspaceColorCustomizations();
	if (!('tab.activeBackground' in workspaceColorCustomizations)) {
		return;
	}
	delete workspaceColorCustomizations['tab.activeBackground'];

	updateWorkspaceColorCustomizations(workspaceColorCustomizations);
}
