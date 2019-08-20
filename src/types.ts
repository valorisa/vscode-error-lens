import * as vscode from 'vscode';

export interface IConfig {
	errorBackground: string;
	errorForeground: string;
	errorMessageBackground: string;

	warningBackground: string;
	warningForeground: string;
	warningMessageBackground: string;

	infoBackground: string;
	infoForeground: string;
	infoMessageBackground: string;

	hintBackground: string;
	hintForeground: string;
	hintMessageBackground: string;

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
	fontWeight: string;
	fontSize: string;
	fontStyleItalic: boolean;

	margin: string;
	enabledDiagnosticLevels: string[];
	addAnnotationTextPrefixes: boolean;
	exclude: Exclude;

	delay?: number;
	clearDecorations: boolean;

	followCursor: FollowCursor;
	followCursorMore: number;

	onSave: boolean;

	editorActiveTabDecorationEnabled: boolean;
	editorActiveTabErrorBackground?: string;
	editorActiveTabWarningBackground?: string;

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

export type GutterIconSet = 'default' | 'defaultOutline' | 'borderless' | 'circle';
export type FollowCursor = 'allLines' | 'activeLine' | 'closestProblem';

export interface IExcludeObject {
	code: string;
	source: string;
}
type Exclude = (string | IExcludeObject)[];

export interface IAggregatedDiagnostics {
	[key: string]: vscode.Diagnostic[];
}
