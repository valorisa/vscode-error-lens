import { addAnnotationPrefix } from 'src/decorations';
import { extensionConfig, Global } from 'src/extension';
import { IAggregatedByLineDiagnostics } from 'src/types';
import vscode, { window } from 'vscode';

export function createStatusBarItem(): void {
	if (extensionConfig.statusBarMessageEnabled) {
		Global.statusBarItem = window.createStatusBarItem(undefined, -9999);
		Global.statusBarItem.show();
	}
}

export function updateStatusBarMessage(editor: vscode.TextEditor, aggregatedDiagnostics: IAggregatedByLineDiagnostics): void {
	const keys = Object.keys(aggregatedDiagnostics);
	if (keys.length === 0) {
		Global.statusBarItem.text = '';
		return;
	}

	const ln = editor.selection.active.line;
	const sorted = keys.map(Number).sort((a, b) => Math.abs(ln - a) - Math.abs(ln - b))[0];
	const closest = aggregatedDiagnostics[sorted][0];
	let prefix = '';

	if (extensionConfig.addAnnotationTextPrefixes) {
		prefix = addAnnotationPrefix(closest.severity);
	}

	const text = `${prefix}${closest.message}`;

	if (extensionConfig.statusBarColorsEnabled) {
		Global.statusBarItem.color = Global.statusBarColors[closest.severity];
	}

	if (extensionConfig.statusBarMessageType === 'closestProblem') {
		Global.statusBarItem.text = text;
	} else if (extensionConfig.statusBarMessageType === 'activeLine') {
		if (closest.range.start.line === ln || closest.range.end.line === ln) {
			Global.statusBarItem.text = text;
		} else {
			Global.statusBarItem.text = '';
		}
	}
}
