# Zoom Canvas API Coverage

This file tracks Zoom Canvas / Zoom Docs API coverage in `zoom-docs-cli`.

Source: <https://developers.zoom.us/docs/api/canvas/>

## Files

| Status | API | CLI command |
| --- | --- | --- |
| Done | `GET /docs/files/{fileId}/content` - Get file content | `zoom-docs-cli get <file>` |
| Pending | `POST /docs/files` - Create a file | |
| Done | `GET /docs/files/{fileId}` - Get file metadata | `zoom-docs-cli metadata <file>` |
| Pending | `PATCH /docs/files/{fileId}` - Modify file metadata | |
| Pending | `DELETE /docs/files/{fileId}` - Delete a file | |
| Pending | `GET /docs/files/{fileId}/children` - List children under a file | |

## Exports

| Status | API | CLI command |
| --- | --- | --- |
| Done | `POST /docs/exports` - Create export | `zoom-docs-cli get <file>` fallback |
| Done | `GET /docs/exports/{exportId}/status` - Get export status | `zoom-docs-cli get <file>` fallback |

## Collaborators

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `GET /docs/files/{fileId}/collaborators` - List collaborators | |
| Pending | `POST /docs/files/{fileId}/collaborators` - Add collaborators | |
| Pending | `PATCH /docs/files/{fileId}/collaborators/{collaboratorId}` - Modify collaborator role | |
| Pending | `DELETE /docs/files/{fileId}/collaborators/{collaboratorId}` - Remove collaborator | |

## General Access

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `GET /docs/files/{fileId}/general_access_setting` - Get general access setting | |
| Pending | `PATCH /docs/files/{fileId}/general_access_setting` - Modify general access setting | |

## Ownership

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `PUT /docs/files/{fileId}/owner` - Transfer file ownership | |

## User Roots

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `GET /docs/users/{userId}/root` - Get user's My Docs information | |

## Imports And Uploads

| Status | API | CLI command |
| --- | --- | --- |
| Pending | `POST /docs/file_uploads` - Create a file upload | |
| Pending | `POST /docs/import_content` - Create a file from content | |
| Pending | `POST /docs/imports` - Create a file by import | |
| Pending | `GET /docs/imports/{importId}/status` - Get import status | |
