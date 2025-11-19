# npm-script-run README

This extension scans your workspace for `package.json` files, lists the available npm scripts in an Explorer view, and lets you run them with a single click.

If you have a monorepo or multi-root workspace with multiple `package.json` files, it groups scripts by the file they come from. If there’s only a single `package.json`, it shows just the scripts without an extra grouping node.

## Features

- **NPM Scripts view in Explorer**
	- Shows a dedicated `NPM Scripts` tree in the Explorer sidebar.
	- Automatically scans the current workspace for `package.json` files (ignoring `node_modules`).

- **Grouping by `package.json`**
	- If your workspace has multiple `package.json` files (e.g. monorepos, multi-root workspaces), each file appears as a parent node in the tree.
	- Child nodes under each package are the npm scripts defined in its `scripts` section.
	- Group nodes use a file icon and show the `package.json` path relative to the workspace folder for quick orientation.
	- If there is only a single `package.json` with scripts, the scripts are listed directly at the root of the view (no grouping node).

- **One-click script execution**
	- Each script node shows a play button in the tree item row.
	- Clicking the play button (or the script item itself) runs `npm run <script>` in a VS Code terminal with the working directory set to that `package.json`'s folder.
	- Terminals are reused per package folder so repeated runs don’t clutter your workspace.

- **Manual refresh**
	- Use the refresh button in the `NPM Scripts` view title bar to re-scan the workspace after changing `package.json` files.

## Requirements

You need:

- A workspace folder containing one or more `package.json` files.
- `npm` available on your system `PATH` so that `npm run` commands can execute in the integrated terminal.

## Extension Settings

This extension does not currently contribute any user-facing settings.