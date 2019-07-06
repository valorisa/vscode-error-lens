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

		errorGutterIconPath?: string;
		warningGutterIconPath?: string;
		infoGutterIconPath?: string;

		errorGutterIconColor: string;
		warningGutterIconColor: string;
		infoGutterIconColor: string;
	};

	fontFamily: string;
	fontStyle: string;
	fontWeight: string;
	fontSize: string;

	margin: string;
	enabledDiagnosticLevels: string[];
	addAnnotationTextPrefixes: boolean;
	exclude: Exclude;
	delay?: number;
	onSave: boolean;
	clearDecorations: boolean;

	gutterIconsEnabled: boolean;
	gutterIconSize: string;
	gutterIconSet: GutterIconSet;

	errorGutterIconPath?: string;
	warningGutterIconPath?: string;
	infoGutterIconPath?: string;

	errorGutterIconColor: string;
	warningGutterIconColor: string;
	infoGutterIconColor: string;
}

export type GutterIconSet = 'default' | 'borderless' | 'circle';

export interface IExcludeObject {
	code: string;
	source: string;
}
type Exclude = (string | IExcludeObject)[];

export interface IAggregatedDiagnostics {
	[key: string]: vscode.Diagnostic[];
}
