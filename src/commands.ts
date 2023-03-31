import { copyProblemMessageCommand } from 'src/commands/copyProblemMessageCommand';
import { revealLineCommand } from 'src/commands/revealLineCommand';
import { statusBarCommand } from 'src/commands/statusBarCommand';
import { toggleEnabledLevels } from 'src/commands/toggleEnabledLevels';
import { toggleWorkspaceCommand } from 'src/commands/toggleWorkspaceCommand';
import { $config } from 'src/extension';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { commands, type ExtensionContext } from 'vscode';

/**
 * All command ids contributed by this extensions.
 */
export const enum CommandId {
	Toggle = 'errorLens.toggle',
	ToggleError = 'errorLens.toggleError',
	ToggleWarning = 'errorLens.toggleWarning',
	ToggleInfo = 'errorLens.toggleInfo',
	ToggleHint = 'errorLens.toggleHint',
	ToggleWorkspace = 'errorlens.toggleWorkspace',
	CopyProblemMessage = 'errorLens.copyProblemMessage',
	StatusBarCommand = 'errorLens.statusBarCommand',
	RevealLine = 'errorLens.revealLine',
}

/**
 * Register all commands contributed by this extension.
 */
export function registerAllCommands(context: ExtensionContext): void {
	// ────────────────────────────────────────────────────────────
	// ──── Global commands ───────────────────────────────────────
	// ────────────────────────────────────────────────────────────
	context.subscriptions.push(commands.registerCommand(CommandId.Toggle, () => {
		vscodeUtils.updateGlobalSetting('errorLens.enabled', !$config.enabled);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleError, () => {
		toggleEnabledLevels('error', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleWarning, () => {
		toggleEnabledLevels('warning', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleInfo, () => {
		toggleEnabledLevels('info', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleHint, () => {
		toggleEnabledLevels('hint', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleWorkspace, toggleWorkspaceCommand));
	context.subscriptions.push(commands.registerCommand(CommandId.RevealLine, revealLineCommand));
	// ────────────────────────────────────────────────────────────
	// ──── Text Editor commands ──────────────────────────────────
	// ────────────────────────────────────────────────────────────
	context.subscriptions.push(commands.registerTextEditorCommand(CommandId.CopyProblemMessage, copyProblemMessageCommand));
	context.subscriptions.push(commands.registerTextEditorCommand(CommandId.StatusBarCommand, statusBarCommand));
}

