import { getAnnotationPrefix } from 'src/decorations';
import { AggregatedByLineDiagnostics, ExtensionConfig } from 'src/types';
import { StatusBarItem, TextEditor, ThemeColor, window } from 'vscode';

export class StatusBar {
	statusBarItem: StatusBarItem;
	statusBarColors: ThemeColor[] = [];

	constructor(
		public readonly isEnabled: boolean,
		public colorsEnabled: boolean,
		public readonly addPrefix: boolean,
		public readonly messageType: ExtensionConfig['statusBarMessageType'],
	) {
		this.colorsEnabled = colorsEnabled;
		this.messageType = messageType;
		this.addPrefix = addPrefix;

		this.statusBarItem = window.createStatusBarItem(undefined, -9999);
		if (this.isEnabled) {
			this.statusBarItem.show();
		}
	}
	updateText(editor: TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics) {
		if (!this.isEnabled) {
			return;
		}
		const keys = Object.keys(aggregatedDiagnostics);
		if (keys.length === 0) {
			this.statusBarItem.text = '';
			return;
		}

		const ln = editor.selection.active.line;
		const sorted = keys.map(Number).sort((a, b) => Math.abs(ln - a) - Math.abs(ln - b))[0];
		const closest = aggregatedDiagnostics[sorted][0];
		let prefix = '';

		if (this.addPrefix) {
			prefix = getAnnotationPrefix(closest.severity);
		}

		const text = `${prefix}${closest.message}`;

		if (this.colorsEnabled) {
			this.statusBarItem.color = this.statusBarColors[closest.severity];
		}

		if (this.messageType === 'closestProblem') {
			this.statusBarItem.text = text;
		} else if (this.messageType === 'activeLine') {
			if (closest.range.start.line === ln || closest.range.end.line === ln) {
				this.statusBarItem.text = text;
			} else {
				this.statusBarItem.text = '';
			}
		}
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}
