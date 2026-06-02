# zoom-docs-cli

Export Zoom Docs pages as Markdown through Zoom Canvas APIs, without browser automation.

The CLI uses Zoom Public Client OAuth with PKCE. It opens a browser for user authorization, stores tokens locally, refreshes expired tokens, and calls the Canvas file content API.

## Requirements

- Node.js 18 or newer
- A Zoom General App with Public Client OAuth enabled
- Canvas/Docs export read scope:

```text
docs:read:export
```

Some Zoom UI/docs may also display the scope as:

```text
docs_export:read
```

Some admin-level endpoints, such as `root`, require additional admin Docs scopes like `docs:read:file:admin`.

## Zoom App Setup

Create a Zoom **General App** in the Zoom App Marketplace.

Enable:

```text
Use Public Client OAuth
```

Add this OAuth redirect URL:

```text
http://localhost:8765/callback
```

Copy the app's **Public Client ID**.

## Install

From this project directory:

```bash
npm link
```

Then use:

```bash
zoom-docs-cli --help
```

You can also run it without linking:

```bash
node ./zoom-docs-cli.js --help
```

## Configure

This repository currently defaults to this Public Client ID:

```text
sg8o0jnAR16nACej8DwrZQ
```

To configure another Zoom app:

```bash
zoom-docs-cli config set --public-client-id "YOUR_PUBLIC_CLIENT_ID"
```

Environment variable alternative:

```bash
export ZOOM_PUBLIC_CLIENT_ID="YOUR_PUBLIC_CLIENT_ID"
```

## Authorize

```bash
zoom-docs-cli auth login
```

If no token is saved, `get` will automatically start the same authorization flow.

## Export A Document

Use a Zoom Docs URL:

```bash
zoom-docs-cli get "https://docs.zoom.us/doc/cUD70vChRIydsC_ci1rfaw" --out doc.md
```

Or pass the file ID directly:

```bash
zoom-docs-cli get cUD70vChRIydsC_ci1rfaw --out doc.md
```

The CLI calls:

```text
GET https://api.zoom.us/v2/docs/files/{fileId}/content
```

For files that are too large for direct content retrieval, it falls back to:

```text
POST /docs/exports
GET /docs/exports/{exportId}/status
```

and downloads the generated Markdown export.

## Commands

```bash
zoom-docs-cli config show
zoom-docs-cli token status
zoom-docs-cli auth logout
zoom-docs-cli export "https://docs.zoom.us/doc/cUD70vChRIydsC_ci1rfaw" --format markdown --wait --out doc.md
zoom-docs-cli export-status EXPORT_ID
zoom-docs-cli metadata "https://docs.zoom.us/doc/cUD70vChRIydsC_ci1rfaw"
zoom-docs-cli root me
zoom-docs-cli children "https://docs.zoom.us/doc/cUD70vChRIydsC_ci1rfaw"
zoom-docs-cli collaborators "https://docs.zoom.us/doc/cUD70vChRIydsC_ci1rfaw"
zoom-docs-cli add-collaborator FILE_ID --user-id USER_ID --role viewer
zoom-docs-cli general-access "https://docs.zoom.us/doc/cUD70vChRIydsC_ci1rfaw"
zoom-docs-cli import-content --file ./draft.md --file-name "Draft from CLI"
zoom-docs-cli file-upload --file ./draft.md
zoom-docs-cli import-file --file-upload-id FILE_UPLOAD_ID --file-upload-type markdown --file-name "Imported from CLI"
zoom-docs-cli import-status IMPORT_ID
zoom-docs-cli create --file-name "Folder from CLI" --file-type folder
zoom-docs-cli rename cUD70vChRIydsC_ci1rfaw --file-name "Renamed from CLI"
zoom-docs-cli delete cUD70vChRIydsC_ci1rfaw --yes
```

To remove old confidential OAuth credentials from local config:

```bash
zoom-docs-cli config set --clear-confidential
```

## Local Storage

Config and tokens are stored outside the repository:

```text
~/.zoom-docs-cli/config.json
~/.zoom-docs-cli/token.json
```

Tokens are local to the user and should not be committed.

## Development

```bash
npm run check
```

This project has no runtime npm dependencies.
