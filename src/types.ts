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
	errorGutterIconPathLight?: string;
	warningGutterIconPath?: string;
	warningGutterIconPathLight?: string;
	infoGutterIconPath?: string;
	infoGutterIconPathLight?: string;

	errorGutterIconColor: string;
	errorGutterIconColorLight: string;
	warningGutterIconColor: string;
	warningGutterIconColorLight: string;
	infoGutterIconColor: string;
	infoGutterIconColorLight: string;
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
