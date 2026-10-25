# Third-party software

## abcjs 6.7.2

The notation renderer is an unmodified, locally hosted copy of **abcjs 6.7.2**,
the stable `latest` release returned by the official npm registry on 2026-10-25.
The exact version is pinned by the vendored files; no CDN or package installation
is required at runtime.

- Upstream: <https://github.com/paulrosen/abcjs>
- Package: <https://www.npmjs.com/package/abcjs/v/6.7.2>
- Registry metadata: <https://registry.npmjs.org/abcjs/6.7.2>
- Source archive: <https://registry.npmjs.org/abcjs/-/abcjs-6.7.2.tgz>
- License: MIT, copyright (c) 2009–2026 Paul Rosen and Gregory Dyke.
- Full license: [docs/vendor/abcjs_basic.LICENSE](docs/vendor/abcjs_basic.LICENSE).

Only the browser bundle and its license were copied from the archive. The license
file was renamed from `package/dist/abcjs-basic-min.js.LICENSE` to match the
`abcjs_basic.LICENSE` filename mentioned in the bundle's preserved header. Neither
file's contents were modified. No package scripts were run.

| Local file | File in npm archive | SHA-256 |
| --- | --- | --- |
| `docs/vendor/abcjs-basic-min.js` | `package/dist/abcjs-basic-min.js` | `3290ef44c918d5e882029d3a47ad3dd63c16c8819da5abe921f3d1e642b4f4f0` |
| `docs/vendor/abcjs_basic.LICENSE` | `package/dist/abcjs-basic-min.js.LICENSE` | `57706d6d731055a627cde38fa5202cd1b274a8b1d57f98eb85b7dd5a1c09d247` |

Archive SHA-256:
`0cfad45dd6bc87626db9b7dd2b0d992b3a04967b73d6324cf3efd22cc0bf0868`.
The downloaded archive was also verified against the registry's SHA-512 integrity
value before copying files:

```text
sha512-cHCyf8j0hAcxTuwZ9l2QznaSlLK1TD2s5oVw6Ig8Kfss6VfJKoNJ1kAzMBwa6DDWeyNl2JH7mN/U+MJ8MYbC5g==
```

Documentation: [Getting started](https://docs.abcjs.net/overview/getting-started)
and [renderAbc options](https://docs.abcjs.net/visual/render-abc-options).
