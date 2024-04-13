import { ErrorLensCodeLens } from 'src/codeLens';
import { $config } from 'src/extension';
import { commands, type Diagnostic, type Location } from 'vscode';

export function codeLensOnClickCommand(location: Location, diagnostics: Diagnostic[]): void {
	switch ($config.codeLensOnClick) {
		case 'showProblemWindow':
			commands.executeCommand('workbench.action.problems.focus');
			break;
		case 'showQuickFix':
			ErrorLensCodeLens.setCaretInEditor(diagnostics[0].range);
			commands.executeCommand('editor.action.quickFix', diagnostics[0]);
			break;
		case 'searchForProblem':
			ErrorLensCodeLens.setCaretInEditor(diagnostics[0].range);
			commands.executeCommand('errorLens.searchForProblem', diagnostics[0]);
			break;
		case 'none':
		default:
			break;
	}
}
