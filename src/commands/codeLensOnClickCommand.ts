import { ErrorLensCodeLens } from 'src/codeLens';
import { CommandId } from 'src/commands';
import { $config } from 'src/extension';
import { Constants } from 'src/types';
import { commands, type Diagnostic, type Location } from 'vscode';

export function codeLensOnClickCommand(location: Location, diagnostics: Diagnostic[]): void {
	switch ($config.codeLensOnClick) {
		case 'showProblemWindow':
			commands.executeCommand(Constants.OpenProblemsViewCommandId);
			break;
		case 'showQuickFix':
			ErrorLensCodeLens.setCaretInEditor(diagnostics[0].range);
			commands.executeCommand(Constants.QuickFixCommandId, diagnostics[0]);
			break;
		case 'searchForProblem':
			ErrorLensCodeLens.setCaretInEditor(diagnostics[0].range);
			commands.executeCommand(CommandId.SearchForProblem, diagnostics[0]);
			break;
		case 'none':
		default:
			break;
	}
}
