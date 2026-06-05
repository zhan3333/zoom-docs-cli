# Zoom Canvas API Coverage

This file tracks Zoom Canvas / Zoom Docs API coverage in `zoom-docs-cli`.

Source: <https://developers.zoom.us/docs/api/canvas/>

## Files

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/content` - Get file content | `zoom-docs-cli get <file>` |
| Done | `POST /docs/files` - Create a file | `zoom-docs-cli create --file-name NAME` |
| Done | `GET /docs/files/{fileId}` - Get file metadata | `zoom-docs-cli metadata <file>` |
| Done | `PATCH /docs/files/{fileId}` - Modify file metadata | `zoom-docs-cli rename <file> --file-name NAME` |
| Done | `DELETE /docs/files/{fileId}` - Delete a file | `zoom-docs-cli delete <file> --yes` |
| Done | `GET /docs/files/{fileId}/children` - List children under a file | `zoom-docs-cli children <file>` |

## Exports

| Status | API | CLI command |
| --- | --- | --- |
| Done | `POST /docs/exports` - Create export | `zoom-docs-cli export <file>` |
| Done | `GET /docs/exports/{exportId}/status` - Get export status | `zoom-docs-cli export-status <exportId>` |

## Collaborators

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/collaborators` - List collaborators | `zoom-docs-cli collaborators <file>` |
| Done | `POST /docs/files/{fileId}/collaborators` - Add collaborators | `zoom-docs-cli add-collaborator <file> --user-id ID` |
| Done | `PATCH /docs/files/{fileId}/collaborators/{collaboratorId}` - Modify collaborator role | `zoom-docs-cli update-collaborator <file> <collaboratorId> --role ROLE` |
| Done | `DELETE /docs/files/{fileId}/collaborators/{collaboratorId}` - Remove collaborator | `zoom-docs-cli remove-collaborator <file> <collaboratorId>` |

## General Access

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/general_access_setting` - Get general access setting | `zoom-docs-cli general-access <file>` |
| Done | `PATCH /docs/files/{fileId}/general_access_setting` - Modify general access setting. Implemented with the documented request body; live test reached Zoom API but Zoom returned HTTP 500 for documented role/scope combinations on a temporary doc. | `zoom-docs-cli set-general-access <file> --share-scope SCOPE` |

## Ownership

| Status | API | CLI command |
| --- | --- | --- |
| Done | `PUT /docs/files/{fileId}/owner` - Transfer file ownership. Guarded by `--yes` because the action moves ownership to another user. | `zoom-docs-cli transfer-owner <file> --user-id USER_ID --yes` |

## User Roots

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/users/{userId}/root` - Get user's My Docs information. Requires `docs:read:file:admin` for the tested app. | `zoom-docs-cli root [userId]` |

## Imports And Uploads

| Status | API | CLI command |
| --- | --- | --- |
| Done | `POST /docs/file_uploads` - Create a file upload | `zoom-docs-cli file-upload --file PATH` |
| Done | `POST /docs/import_content` - Create a file from content | `zoom-docs-cli import-content --file FILE.md` |
| Done | `POST /docs/imports` - Create a file by import | `zoom-docs-cli import-file --file-upload-id ID` |
| Done | `GET /docs/imports/{importId}/status` - Get import status | `zoom-docs-cli import-status <importId>` |
