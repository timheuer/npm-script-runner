// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ScriptNode, PackageNode } from './nodes';
import { NpmScriptsProvider } from './npmScriptsProvider';
import { NpmTerminalManager } from './npmTerminalManager';
import { ScriptCodeLensProvider } from './scriptCodeLensProvider';
import { initializeLogger, getLogger } from './logger';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	const logger = initializeLogger(context);
	logger.info('Extension "npm-script-runner" is now active.');

	const provider = new NpmScriptsProvider(context);
	const terminalManager = new NpmTerminalManager();
	const codeLensProvider = new ScriptCodeLensProvider();
	
	// Watch for package.json file changes (create/change/delete)
	const packageJsonWatcher = vscode.workspace.createFileSystemWatcher('**/package.json');
	packageJsonWatcher.onDidCreate(() => {
		logger.debug('package.json created, refreshing tree view');
		provider.refresh();
	});
	packageJsonWatcher.onDidChange(() => {
		logger.debug('package.json changed, refreshing tree view');
		provider.refresh();
	});
	packageJsonWatcher.onDidDelete(() => {
		logger.debug('package.json deleted, refreshing tree view');
		provider.refresh();
	});
	
	logger.debug('Registered tree data provider, code lens provider, and file watcher');

	context.subscriptions.push(
		packageJsonWatcher,
		vscode.window.registerTreeDataProvider('npmScriptRunner.scripts', provider),
		vscode.languages.registerCodeLensProvider(
			{ language: 'json', pattern: '**/package.json' },
			codeLensProvider
		),
		vscode.commands.registerCommand('npmscriptrunner.refreshScripts', () => {
			getLogger().debug('Refresh scripts command triggered');
			provider.refresh();
		}),
		vscode.commands.registerCommand('npmscriptrunner.runScript', (node: ScriptNode) => {
			if (node instanceof ScriptNode) {
				getLogger().info(`Running script: ${node.scriptName}`);
				terminalManager.runScript(node);
			}
		}),
		vscode.commands.registerCommand('npmscriptrunner.goToScript', async (node: ScriptNode) => {
			if (node instanceof ScriptNode) {
				getLogger().debug(`Navigating to script: ${node.scriptName}`);
				const document = await vscode.workspace.openTextDocument(node.packageNode.uri);
				const editor = await vscode.window.showTextDocument(document);
				
				// Navigate to the script line
				const line = node.lineNumber;
				const lineText = document.lineAt(line).text;
				const startChar = lineText.indexOf(`"${node.scriptName}"`);
				const position = new vscode.Position(line, startChar >= 0 ? startChar : 0);
				editor.selection = new vscode.Selection(position, position);
				editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
			}
		}),
		vscode.commands.registerCommand('npmscriptrunner.runScriptFromCodeLens', async (scriptName: string, packageUri: vscode.Uri) => {
			getLogger().info(`Running script from CodeLens: ${scriptName}`);
			// Find the workspace folder for this package.json
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(packageUri);
			
			// Create a PackageNode and ScriptNode to reuse the terminal manager
			const packageNode = new PackageNode(
				packageUri,
				workspaceFolder?.name || packageUri.fsPath,
				workspaceFolder
			);
			
			const scriptNode = new ScriptNode(scriptName, '', packageNode);
			terminalManager.runScript(scriptNode);
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	getLogger().info('Extension "npm-script-runner" is deactivating.');
}
