'use strict';
import * as vscode from 'vscode';
import { window, workspace } from 'vscode';
import { IAggregatedDiagnostics, IConfig } from './types';
import { isObject, truncate } from './utils';

const EXTNAME = 'errorLens';

export function activate(context: vscode.ExtensionContext) {
	let config = workspace.getConfiguration(EXTNAME) as any as IConfig;
	let errorLensEnabled = true;
	let errorLensDecorationTypeError: vscode.TextEditorDecorationType;
	let errorLensDecorationTypeWarning: vscode.TextEditorDecorationType;
	let errorLensDecorationTypeInfo: vscode.TextEditorDecorationType;
	let errorLensDecorationTypeHint: vscode.TextEditorDecorationType;
	setBackgroundDecorations();

	const disposableToggleErrorLens = vscode.commands.registerCommand('errorLens.toggle', () => {
		errorLensEnabled = !errorLensEnabled;
		updateAllDecorations();
	});

	vscode.languages.onDidChangeDiagnostics(onChangedDiagnostics, undefined, context.subscriptions);

	// Note: URIs for onDidOpenTextDocument() can contain schemes other than file:// (such as git://)
	// workspace.onDidOpenTextDocument(textDocument => {
	// 	updateDecorationsForUri(textDocument.uri);
	// }, undefined, context.subscriptions);

	// Update on editor switch.
	window.onDidChangeActiveTextEditor(textEditor => {
		if (textEditor) {
			updateDecorationsForUri(textEditor.document.uri, textEditor);
		}
	}, undefined, context.subscriptions);

	/**
     * Invoked by onDidChangeDiagnostics() when the language diagnostics change.
     *
     * @param {vscode.DiagnosticChangeEvent} diagnosticChangeEvent - Contains info about the change in diagnostics.
     */
	function onChangedDiagnostics(diagnosticChangeEvent: vscode.DiagnosticChangeEvent) {
		// Many URIs can change - we only need to decorate all visible editors
		for (const uri of diagnosticChangeEvent.uris) {
			for (const editor of window.visibleTextEditors) {
				if (uri.fsPath === editor.document.uri.fsPath) {
					updateDecorationsForUri(uri, editor);
				}
			}
		}
	}

	/**
     * Update the editor decorations for the provided URI. Only if the URI scheme is "file" is the function
     * processed. (It can be others, such as "git://<something>", in which case the function early-exits).
     *
     * @param {vscode.Uri} uriToDecorate - Uri to add decorations to.
     */
	function updateDecorationsForUri(uriToDecorate : vscode.Uri, editor?: vscode.TextEditor) {
		if (!uriToDecorate) {
			return;
		}

		// Only process "file://" URIs.
		if (uriToDecorate.scheme !== 'file') {
			return;
		}

		const activeTextEditor : vscode.TextEditor | undefined = window.activeTextEditor;
		if (editor === undefined) {
			editor = activeTextEditor;// tslint:disable-line
		}
		if (!editor) {
			return;
		}

		if (!editor.document.uri.fsPath) {
			return;
		}

		const errorLensDecorationOptionsError: vscode.DecorationOptions[] = [];
		const errorLensDecorationOptionsWarning: vscode.DecorationOptions[] = [];
		const errorLensDecorationOptionsInfo: vscode.DecorationOptions[] = [];
		const errorLensDecorationOptionsHint: vscode.DecorationOptions[] = [];

		// The aggregatedDiagnostics object will contain one or more objects, each object being keyed by "N",
		// where N is the source line where one or more diagnostics are being reported.
		// Each object which is keyed by "N" will contain one or more arrayDiagnostics[] array of objects.
		// This facilitates gathering info about lines which contain more than one diagnostic.
		// {
		//     67: [
		//         <vscode.Diagnostic #1>,
		//         <vscode.Diagnostic #2>
		//     ],
		//     93: [
		//         <vscode.Diagnostic #1>
		//     ]
		// };

		if (errorLensEnabled) {
			let aggregatedDiagnostics: IAggregatedDiagnostics = {};
			let diagnostic: vscode.Diagnostic;
			const exclude = config.exclude || [];
			// Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
			// a list of objects, grouping together diagnostics which occur on a single line.
			nextDiagnostic:
			for (diagnostic of vscode.languages.getDiagnostics(uriToDecorate)) {
				// Exclude items specified in `errorLens.exclude` setting
				for (const excludeItem of exclude) {
					if (typeof excludeItem === 'string') {
						if (new RegExp(excludeItem, 'i').test(diagnostic.message)) {
							continue nextDiagnostic;
						}
					} else if (isObject(excludeItem)) {
						if (diagnostic.source === excludeItem.source &&
							String(diagnostic.code) === excludeItem.code) {
							continue nextDiagnostic;
						}
					}
				}
				const key = diagnostic.range.start.line;

				if (aggregatedDiagnostics[key]) {
					// Already added an object for this key, so augment the arrayDiagnostics[] array.
					aggregatedDiagnostics[key].push(diagnostic);
				} else {
					// Create a new object for this key, specifying the line: and a arrayDiagnostics[] array
					aggregatedDiagnostics[key] = [diagnostic];
				}
			}

			for (const key in aggregatedDiagnostics) {
				let aggregatedDiagnostic = aggregatedDiagnostics[key];
				let messagePrefix = '';

				if (config.addAnnotationTextPrefixes) {
					if (aggregatedDiagnostic.length > 1) {
						// If > 1 diagnostic for this source line, the prefix is "Diagnostic #1 of N: "
						messagePrefix += 'Diagnostic 1/' + String(aggregatedDiagnostic.length) + ': ';
					} else {
						// If only 1 diagnostic for this source line, show the diagnostic severity
						switch (aggregatedDiagnostic[0].severity) {
							case 0:
								messagePrefix += 'ERROR: ';
								break;

							case 1:
								messagePrefix += 'WARNING: ';
								break;

							case 2:
								messagePrefix += 'INFO: ';
								break;

							case 3:
							default:
								messagePrefix += 'HINT: ';
								break;
						}
					}
				}

				let decorationTextColor;
				let addErrorLens = false;
				switch (aggregatedDiagnostic[0].severity) {
					// Error
					case 0:
						if (config.enabledDiagnosticLevels.indexOf('error') !== -1) {
							addErrorLens = true;
							decorationTextColor = config.errorForeground;
						}
						break;
					// Warning
					case 1:
						if (config.enabledDiagnosticLevels.indexOf('warning') !== -1) {
							addErrorLens = true;
							decorationTextColor = config.warningForeground;
						}
						break;
					// Info
					case 2:
						if (config.enabledDiagnosticLevels.indexOf('info') !== -1) {
							addErrorLens = true;
							decorationTextColor = config.infoForeground;
						}
						break;
					// Hint
					case 3:
						if (config.enabledDiagnosticLevels.indexOf('hint') !== -1) {
							addErrorLens = true;
							decorationTextColor = config.hintForeground;
						}
						break;
				}

				if (addErrorLens) {
					// Generate a DecorationInstanceRenderOptions object which specifies the text which will be rendered
					// after the source-code line in the editor, and text rendering options.
					const decInstanceRenderOptions: vscode.DecorationInstanceRenderOptions = {
						after: {
							contentText: truncate(messagePrefix + aggregatedDiagnostic[0].message),
							fontStyle: config.fontStyle,
							fontWeight: config.fontWeight,
							margin: config.margin,
							color: decorationTextColor,
							textDecoration: `;font-size:${config.fontSize};line-height:1;`,
						},
					};

					// See type 'DecorationOptions': https://code.visualstudio.com/docs/extensionAPI/vscode-api#DecorationOptions
					const diagnosticDecorationOptions: vscode.DecorationOptions = {
						range: aggregatedDiagnostic[0].range,
						renderOptions: decInstanceRenderOptions,
					};

					switch (aggregatedDiagnostic[0].severity) {
						// Error
						case 0:
							errorLensDecorationOptionsError.push(diagnosticDecorationOptions);
							break;
						// Warning
						case 1:
							errorLensDecorationOptionsWarning.push(diagnosticDecorationOptions);
							break;
						// Info
						case 2:
							errorLensDecorationOptionsInfo.push(diagnosticDecorationOptions);
							break;
						// Hint
						case 3:
							errorLensDecorationOptionsHint.push(diagnosticDecorationOptions);
							break;
					}
				}
			}
		}

		// The errorLensDecorationOptions<X> arrays have been built, now apply them.
		editor.setDecorations(errorLensDecorationTypeError, errorLensDecorationOptionsError);
		editor.setDecorations(errorLensDecorationTypeWarning, errorLensDecorationOptionsWarning);
		editor.setDecorations(errorLensDecorationTypeInfo, errorLensDecorationOptionsInfo);
		editor.setDecorations(errorLensDecorationTypeHint, errorLensDecorationOptionsHint);
	}

	function updateConfig(e: vscode.ConfigurationChangeEvent) {
		if (!e.affectsConfiguration(EXTNAME)) return;

		config = workspace.getConfiguration(EXTNAME) as any as IConfig;

		errorLensDecorationTypeError.dispose();
		errorLensDecorationTypeWarning.dispose();
		errorLensDecorationTypeInfo.dispose();
		errorLensDecorationTypeHint.dispose();

		setBackgroundDecorations();
		updateAllDecorations();
	}

	function setBackgroundDecorations() {
		// Create decorator types that we use to amplify lines containing errors, warnings, info, etc.
		// createTextEditorDecorationType() ref. @ https://code.visualstudio.com/docs/extensionAPI/vscode-api#window.createTextEditorDecorationType
		// DecorationRenderOptions ref.  @ https://code.visualstudio.com/docs/extensionAPI/vscode-api#DecorationRenderOptions
		errorLensDecorationTypeError = window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.errorBackground,
		});
		errorLensDecorationTypeWarning = window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.warningBackground,
		});
		errorLensDecorationTypeInfo = window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.infoBackground,
		});
		errorLensDecorationTypeHint = window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.hintBackground,
		});
	}

	function updateAllDecorations() {
		for (const editor of window.visibleTextEditors) {
			updateDecorationsForUri(editor.document.uri, editor);
		}
	}

	context.subscriptions.push(workspace.onDidChangeConfiguration(updateConfig, EXTNAME));
	context.subscriptions.push(disposableToggleErrorLens);
}

export function deactivate() {}
