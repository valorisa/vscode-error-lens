import * as vscode from 'vscode';

export interface IConfig {
	errorBackground: string;
	errorForeground: string;
	warningBackground: string;
	warningForeground: string;
	infoBackground: string;
	infoForeground: string;
	hintBackground: string;
	hintForeground: string;

	light: {
		errorBackground: string;
		errorForeground: string;
		warningBackground: string;
		warningForeground: string;
		infoBackground: string;
		infoForeground: string;
		hintBackground: string;
		hintForeground: string;
	};

	fontStyle: string;
	fontWeight: string;
	fontSize: string;

	margin: string;
	enabledDiagnosticLevels: string[];
	addAnnotationTextPrefixes: boolean;
	exclude: Exclude;
}

interface IExcludeObject {
	code: string;
	source: string;
}
type Exclude = (string | IExcludeObject)[];

export interface IAggregatedDiagnostics {
	[key: string]: vscode.Diagnostic[];
}
