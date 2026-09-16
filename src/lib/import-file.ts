/**
 * iOS Files maps accept to Uniform Type Identifiers. .sqlite and
 * application/vnd.sqlite3 are not public UTIs, so a Chrome-downloaded
 * expnstracker.sqlite (often tagged public.data) is greyed out.
 * application/octet-stream maps to public.data; a wildcard MIME keeps every
 * document tappable. isSqliteFile still checks the SQLite magic header.
 */
export const IMPORT_DATABASE_ACCEPT = "application/octet-stream,*/*";

/** Generic download type so iOS/Safari do not assign an unselectable SQLITE UTI. */
export const EXPORT_DATABASE_MIME = "application/octet-stream";
