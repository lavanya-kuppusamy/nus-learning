# Snip — URL Shortener Backend

A minimal Bun HTTP server that shortens URLs. Zero npm dependencies, single file.

## Quick Start

```bash
bun run server.js
# or
bun start
```

## Environment Variables

| Variable               | Default                       | Description |
|------------------------|-------------------------------|-------------|
| `PORT`                 | `3000`                        | HTTP port |
| `BASE_URL`             | `http://localhost:<PORT>`     | Origin for `shortUrl`; auto-detects `RAILWAY_PUBLIC_DOMAIN` |
| `PUBLIC_DIR`           | *(unset)*                     | Absolute path to a static-file directory; files are checked before short-code lookup |

## API

### `POST /api/links`
```json
{ "url": "https://example.com" }
```
Returns **201**:
```json
{ "code": "aB3xZ9", "url": "https://example.com", "shortUrl": "http://localhost:3000/aB3xZ9", "hits": 0, "createdAt": "2024-01-01T00:00:00.000Z" }
```
Returns **400** for invalid JSON or non-http(s) URL.

### `GET /api/links`
Returns **200** with an array of all stored links (same shape as above, with live `hits`).

### `GET /:code`
Redirects **302** to the original URL and increments `hits`. Returns **404** for unknown codes.
