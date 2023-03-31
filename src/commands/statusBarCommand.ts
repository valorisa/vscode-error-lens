import { $config, $state } from 'src/extension';
import { Constants } from 'src/types';
import { Range, Selection, TextEditorRevealType, commands, env, type TextEditor } from 'vscode';

export async function statusBarCommand(editor: TextEditor): Promise<void> {
	if ($config.statusBarCommand === 'goToLine' || $config.statusBarCommand === 'goToProblem') {
		const range = new Range($state.statusBarMessage.activeMessagePosition, $state.statusBarMessage.activeMessagePosition);
		editor.selection = new Selection(range.start, range.end);
		editor.revealRange(range, TextEditorRevealType.Default);
		await commands.executeCommand(Constants.FocusActiveEditorCommandId);

		if ($config.statusBarCommand === 'goToProblem') {
			commands.executeCommand(Constants.NextProblemCommandId);
		}
	} else if ($config.statusBarCommand === 'copyMessage') {
		const source = $state.statusBarMessage.activeMessageSource ? `[${$state.statusBarMessage.activeMessageSource}] ` : '';
		env.clipboard.writeText(source + $state.statusBarMessage.activeMessageText);
	}
}
