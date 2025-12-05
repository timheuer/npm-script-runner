import * as vscode from 'vscode';
import { ScriptNode } from './nodes';
import { getLogger } from './logger';

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
			getLogger().debug(`Creating new terminal: ${name}`);
			terminal = vscode.window.createTerminal({ name, cwd: folderUri.fsPath });
			this.terminals.set(key, terminal);
		}
		terminal.show(true);
		getLogger().trace(`Sending command to terminal: npm run ${node.scriptName}`);
		terminal.sendText(`npm run ${node.scriptName}`, true);
	}
}
