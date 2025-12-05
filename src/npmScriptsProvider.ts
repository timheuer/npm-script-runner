import * as vscode from 'vscode';
import { MessageNode, NpmTreeNode, PackageNode, ScriptNode } from './nodes';
import { getLogger } from './logger';

export class NpmScriptsProvider implements vscode.TreeDataProvider<NpmTreeNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<NpmTreeNode | undefined | null | void> = new vscode.EventEmitter();
	readonly onDidChangeTreeData: vscode.Event<NpmTreeNode | undefined | null | void> = this._onDidChangeTreeData.event;

	private cache: { packages: PackageNode[]; scriptsByPackage: Map<string, ScriptNode[]> } | null = null;

	constructor(private readonly context: vscode.ExtensionContext) {}

	refresh(): void {
		getLogger().debug('Refreshing NPM scripts tree view');
		this.cache = null;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: NpmTreeNode): vscode.TreeItem {
		if (element instanceof MessageNode) {
			const item = new vscode.TreeItem(element.message, vscode.TreeItemCollapsibleState.None);
			item.contextValue = 'npmScriptRunner.message';
			item.iconPath = new vscode.ThemeIcon('info');
			return item;
		}

		if (element instanceof PackageNode) {
			const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
			item.tooltip = element.uri.fsPath;
			item.resourceUri = element.uri;
			item.iconPath = vscode.ThemeIcon.File;
			item.description = this.getPackageDescription(element);
			return item;
		}

		const item = new vscode.TreeItem(element.scriptName, vscode.TreeItemCollapsibleState.None);
		item.description = element.command;
		item.tooltip = element.command;
		item.contextValue = 'npmScriptRunner.script';
		item.iconPath = new vscode.ThemeIcon('wrench');
		item.command = {
			command: 'npmscriptrunner.goToScript',
			title: 'Go to Script',
			arguments: [element],
		};
		return item;
	}

	async getChildren(element?: NpmTreeNode): Promise<NpmTreeNode[]> {
		if (element instanceof MessageNode) {
			return [];
		}

		if (element instanceof PackageNode) {
			const cache = await this.ensureCache();
			const key = element.uri.toString();
			return cache.scriptsByPackage.get(key) ?? [];
		}

		const cache = await this.ensureCache();

		// If no packages with scripts were found, show a message
		if (cache.packages.length === 0) {
			return [new MessageNode('No npm scripts found in package.json files')];
		}

		// If there is only one package.json with scripts, show scripts directly at root
		if (cache.packages.length === 1) {
			const onlyPkg = cache.packages[0];
			const scripts = cache.scriptsByPackage.get(onlyPkg.uri.toString()) ?? [];
			if (scripts.length === 0) {
				return [new MessageNode('No npm scripts found in package.json files')];
			}
			return scripts;
		}
		return cache.packages;
	}

	private async ensureCache(): Promise<{ packages: PackageNode[]; scriptsByPackage: Map<string, ScriptNode[]> }> {
		if (this.cache) {
			return this.cache;
		}

		getLogger().debug('Building cache of package.json files and scripts');
		const packages: PackageNode[] = [];
		const scriptsByPackage = new Map<string, ScriptNode[]>();

		const packageFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
		getLogger().trace(`Found ${packageFiles.length} package.json files`);
		for (const uri of packageFiles) {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
			const label = this.getPackageLabel(uri, workspaceFolder);
			const pkgNode = new PackageNode(uri, label, workspaceFolder ?? undefined);
			packages.push(pkgNode);

			const scripts = await this.readScriptsFromPackageJson(uri, pkgNode);
			if (scripts.length) {
				scriptsByPackage.set(uri.toString(), scripts);
			}
		}

		// Only keep packages that have scripts
		const filteredPackages = packages.filter(pkg => scriptsByPackage.has(pkg.uri.toString()));
		getLogger().debug(`Cached ${filteredPackages.length} packages with scripts`);
		this.cache = { packages: filteredPackages, scriptsByPackage };
		return this.cache;
	}

	private getPackageLabel(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder | undefined): string {
		if (!workspaceFolder) {
			return uri.fsPath;
		}
		const relative = uri.fsPath.substring(workspaceFolder.uri.fsPath.length).replace(/^\\|\//, '');
		return relative || workspaceFolder.name;
	}

	private getPackageDescription(pkg: PackageNode): string | undefined {
		if (!pkg.workspaceFolder) {
			return undefined;
		}
		const relative = pkg.uri.fsPath.substring(pkg.workspaceFolder.uri.fsPath.length).replace(/^\\|\//, '');
		return relative || undefined;
	}

	private async readScriptsFromPackageJson(uri: vscode.Uri, pkgNode: PackageNode): Promise<ScriptNode[]> {
		try {
			const bytes = await vscode.workspace.fs.readFile(uri);
			const text = Buffer.from(bytes).toString('utf8');
			const json = JSON.parse(text) as { scripts?: Record<string, string> };
			if (!json.scripts || typeof json.scripts !== 'object') {
				return [];
			}
			
			// Find line numbers for each script
			const lines = text.split(/\r?\n/);
			const scriptLineNumbers = new Map<string, number>();
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				// Match script entries like: "scriptName": "command"
				const match = line.match(/^\s*"([^"]+)"\s*:/);
				if (match) {
					const scriptName = match[1];
					if (json.scripts[scriptName] !== undefined) {
						scriptLineNumbers.set(scriptName, i);
					}
				}
			}
			
			const result: ScriptNode[] = [];
			for (const [name, command] of Object.entries(json.scripts)) {
				if (typeof command === 'string') {
					const lineNumber = scriptLineNumbers.get(name) ?? 0;
					result.push(new ScriptNode(name, command, pkgNode, lineNumber));
				}
			}
			return result;
		} catch (err) {
			getLogger().error(`Failed to read scripts from ${uri.fsPath}`, err);
			return [];
		}
	}
}
