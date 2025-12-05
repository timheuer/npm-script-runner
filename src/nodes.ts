import * as vscode from 'vscode';

export type NpmTreeNode = PackageNode | ScriptNode | MessageNode;

export class MessageNode {
	constructor(public readonly message: string) {}
}

export class PackageNode {
	constructor(
		public readonly uri: vscode.Uri,
		public readonly label: string,
		public readonly workspaceFolder: vscode.WorkspaceFolder | undefined,
	) {}
}

export class ScriptNode {
	constructor(
		public readonly scriptName: string,
		public readonly command: string,
		public readonly packageNode: PackageNode,
		public readonly lineNumber: number = 0,
	) {}
}
