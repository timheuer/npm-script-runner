import * as vscode from 'vscode';
import { ScriptNode } from './nodes';

export class NpmTerminalManager {
	private terminals = new Map<string, vscode.Terminal>();

	runScript(node: ScriptNode): void {
		const folderUri = vscode.Uri.joinPath(node.packageNode.uri, '..');
		const key = folderUri.fsPath;
		let terminal = this.terminals.get(key);
		if (!terminal) {
			const name = node.packageNode.workspaceFolder
				? `npm scripts: ${node.packageNode.workspaceFolder.name}`
				: `npm scripts: ${folderUri.fsPath}`;
			terminal = vscode.window.createTerminal({ name, cwd: folderUri.fsPath });
			this.terminals.set(key, terminal);
		}
		terminal.show(true);
		terminal.sendText(`npm run ${node.scriptName}`, true);
	}
}
