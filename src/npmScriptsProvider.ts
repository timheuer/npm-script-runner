import * as vscode from 'vscode';
import { NpmTreeNode, PackageNode, ScriptNode } from './nodes';

export class NpmScriptsProvider implements vscode.TreeDataProvider<NpmTreeNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<NpmTreeNode | undefined | null | void> = new vscode.EventEmitter();
	readonly onDidChangeTreeData: vscode.Event<NpmTreeNode | undefined | null | void> = this._onDidChangeTreeData.event;

	private cache: { packages: PackageNode[]; scriptsByPackage: Map<string, ScriptNode[]> } | null = null;

	constructor(private readonly context: vscode.ExtensionContext) {}

	refresh(): void {
		this.cache = null;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: NpmTreeNode): vscode.TreeItem {
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
		item.command = {
			command: 'npm-script-runner.runScript',
			title: 'Run NPM Script',
			arguments: [element],
		};
		return item;
	}

	async getChildren(element?: NpmTreeNode): Promise<NpmTreeNode[]> {
		if (element instanceof PackageNode) {
			const cache = await this.ensureCache();
			const key = element.uri.toString();
			return cache.scriptsByPackage.get(key) ?? [];
		}

		const cache = await this.ensureCache();
		// If there is only one package.json with scripts, show scripts directly at root
		if (cache.packages.length === 1) {
			const onlyPkg = cache.packages[0];
			return cache.scriptsByPackage.get(onlyPkg.uri.toString()) ?? [];
		}
		return cache.packages;
	}

	private async ensureCache(): Promise<{ packages: PackageNode[]; scriptsByPackage: Map<string, ScriptNode[]> }> {
		if (this.cache) {
			return this.cache;
		}

		const packages: PackageNode[] = [];
		const scriptsByPackage = new Map<string, ScriptNode[]>();

		const packageFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
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
			const result: ScriptNode[] = [];
			for (const [name, command] of Object.entries(json.scripts)) {
				if (typeof command === 'string') {
					result.push(new ScriptNode(name, command, pkgNode));
				}
			}
			return result;
		} catch (err) {
			console.error(`Failed to read scripts from ${uri.fsPath}:`, err);
			return [];
		}
	}
}
