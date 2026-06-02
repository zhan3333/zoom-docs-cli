# Zoom Canvas API Coverage

This file tracks Zoom Canvas / Zoom Docs API coverage in `zoom-docs-cli`.

Source: <https://developers.zoom.us/docs/api/canvas/>

## Files

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/content` - Get file content | `zoom-docs-cli get <file>` |
| Done | `POST /docs/files` - Create a file | `zoom-docs-cli create --file-name NAME` |
| Done | `GET /docs/files/{fileId}` - Get file metadata | `zoom-docs-cli metadata <file>` |
| Pending | `PATCH /docs/files/{fileId}` - Modify file metadata | |
| Done | `DELETE /docs/files/{fileId}` - Delete a file | `zoom-docs-cli delete <file> --yes` |
| Done | `GET /docs/files/{fileId}/children` - List children under a file | `zoom-docs-cli children <file>` |

## Exports

| Status | API | CLI command |
| --- | --- | --- |
| Done | `POST /docs/exports` - Create export | `zoom-docs-cli get <file>` fallback |
| Done | `GET /docs/exports/{exportId}/status` - Get export status | `zoom-docs-cli get <file>` fallback |

## Collaborators

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/collaborators` - List collaborators | `zoom-docs-cli collaborators <file>` |
| Pending | `POST /docs/files/{fileId}/collaborators` - Add collaborators | |
| Pending | `PATCH /docs/files/{fileId}/collaborators/{collaboratorId}` - Modify collaborator role | |
| Pending | `DELETE /docs/files/{fileId}/collaborators/{collaboratorId}` - Remove collaborator | |

## General Access

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/general_access_setting` - Get general access setting | `zoom-docs-cli general-access <file>` |
| Pending | `PATCH /docs/files/{fileId}/general_access_setting` - Modify general access setting | |

## Ownership

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `PUT /docs/files/{fileId}/owner` - Transfer file ownership | |

## User Roots

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/users/{userId}/root` - Get user's My Docs information. Requires `docs:read:file:admin` for the tested app. | `zoom-docs-cli root [userId]` |

## Imports And Uploads

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `POST /docs/file_uploads` - Create a file upload | |
| Done | `POST /docs/import_content` - Create a file from content | `zoom-docs-cli import-content --file FILE.md` |
| Pending | `POST /docs/imports` - Create a file by import | |
| Pending | `GET /docs/imports/{importId}/status` - Get import status | |
