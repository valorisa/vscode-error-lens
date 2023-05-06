import { $config } from 'src/extension';
import { Constants, type ExtensionConfig } from 'src/types';
import { extUtils } from 'src/utils/extUtils';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { Position, window, type Diagnostic } from 'vscode';

export function disableLineCommand(diagnostic: Diagnostic | undefined): void {
	const editor = window.activeTextEditor;
	if (!editor) {
		return;
	}

	let lineNumber: number;

	if (diagnostic) {
		// Passed diagnostic is not a real diagnostic - json stringified.
		lineNumber = (diagnostic.range as unknown as { character: number; line: number }[])[0].line;
	} else {
		const diagnosticAtActiveLine = extUtils.getDiagnosticAtLine(editor.document.uri, editor.selection.active.line);
		if (!diagnosticAtActiveLine) {
			return;
		}
		// eslint-disable-next-line no-param-reassign
		diagnostic = diagnosticAtActiveLine;
		lineNumber = diagnostic.range.start.line;
	}

	if (!diagnostic.source) {
		window.showWarningMessage('Diagnostic has no "source".');
		return;
	}

	const template = $config.disableLineComments[diagnostic.source];

	if (!template) {
		showNoCommentSpecifiedForSource(diagnostic.source);
		return;
	}

	const comment = extUtils.diagnosticToInlineMessage(template, diagnostic, 0);

	let position: Position;
	if (lineNumber <= 1) {
		position = new Position(0, 0);
	} else {
		position = new Position(lineNumber, 0);
	}

	editor.edit(builder => {
		builder.insert(position, `${vscodeUtils.getIndentationAtLine(editor.document, lineNumber)}${comment}\n`);
	});
}

async function showNoCommentSpecifiedForSource(source: string): Promise<void> {
	const showSettingsButton = 'Show Settings';
	const pressedButton = await window.showInformationMessage(`Comment not specified for source "${source}"`, showSettingsButton);
	if (pressedButton === showSettingsButton) {
		vscodeUtils.openSettingGuiAt(`@ext:${Constants.ExtensionId} ${'disableLineComments' satisfies keyof ExtensionConfig}`);
	}
}
