# Task report: Resend SDK with the Voxgig SDK generator

An unofficial TypeScript SDK for the [Resend](https://resend.com) email API, generated with the
[Voxgig SDK generator](https://voxgig.com/sdk) from Resend's official OpenAPI spec
([resend/resend-openapi](https://github.com/resend/resend-openapi), v1.5.1, 72 paths, 113
operations). AI-assisted (Claude Code), as the brief allowed.

**Environment:** Windows 11, Node 24.18, npm 11.16, `@voxgig/create-sdkgen` 0.30.7,
`@voxgig/sdkgen` 4.34.5, `aontu` 0.76.0.

**Time:** 16 minutes from the first command to a working live SDK. About half of that went on two
Windows issues and npm installs.

## Result

- TypeScript SDK with 60 entities that builds cleanly.
- Offline suite: 641 tests, 573 pass, 65 skipped, 3 fail (two root causes, see issue 4).
- Live, read-only against `api.resend.com`: `Domain().list()`, `ApiKey().list()`,
  `Email().list()`, `Contact().list()` and `Segment().list()` all succeed. No email was sent.

## Issues, most impactful first

### 1. Windows: `create-sdkgen` cannot start npm

The scaffold writes its files, then stops with `Failed to start npm: spawn npm ENOENT`.
`runNpm` calls `spawn('npm', args, spawn_opts)` (`dist/create-sdkgen.js:185`). On Windows npm is
`npm.cmd`, which `spawn` can't run without a shell. Since Node 18.20.2 / 20.12.2, `.cmd` files also
need `shell: true`.

- **Fix:** pass `shell: process.platform === 'win32'`.
- **Workaround:** re-run with `--no-install`. The resulting error message is excellent: it says
  exactly what to run (`npm install`, then `npm run add-target` / `add-feature` in `.sdk`), and that
  worked.

### 2. Windows: bare relative imports in the model fail to resolve

`npm run generate` fails on `@"api/api-info.aontu"` in `model/sdk.aontu` with "source not found",
although the file exists at `model/api/api-info.aontu`. aontu's search-path list shows why: the
first candidate resolves against `.sdk/` rather than `model/`, and is written as
`/Users/taimo/...` with the `C:` drive letter dropped. Imports written as `./config.aontu` resolve
fine. `test/test.aontu` has the same problem.

- **Workaround:** prefix the nine bare imports with `./`.
- **Note:** `sdk.aontu` is toolchain-derived, so a resync would undo this. The real fix belongs
  in aontu's path resolution, or the templates could always emit `./`.

### 3. Entity inference splits one resource across many entities

Resend names its response schemas per operation (`UpdateSegmentResponseSuccess`,
`RemoveSegmentResponseSuccess`, ...). The generator turned many of these into entities: 35 of the 60
are operation-shaped, such as `RemoveContactResponseSuccess`, `UpdateTopicResponseSuccess` and
`CreateApiKey`. The worst case was `Segment`, which got only `load`. Its `create` and `list` landed
on `RemoveSegmentResponseSuccess`, so a user would have had to write
`client.RemoveSegmentResponseSuccess().list()`.

**The guide fixed it well.** A 20-line override in `model/guide/guide.aontu` deactivates the two
stray entities and puts create/list/update/remove on `segment`. After regenerating, `Segment` had
all five operations and `Segment().list()` worked live. This is the best part of the design:
declarative, small, and a fast regenerate loop.

**Suggestions:**
- Strip `Create|Update|Remove|List` prefixes and `Response(Success)?` suffixes, and group by path
  prefix before naming entities.
- Print an entity-to-paths table at the end of scaffold so bad grouping is visible straight away,
  not only when calling the SDK.

### 4. Generated docs and tests that fail in the SDK's own test mode

- The README and REFERENCE example `client.ReceivedEmail().load({ email_id: 'email_id' })` throws
  `Operation "load" has no endpoint whose path parameters are all given (missing: email_id)`. This
  accounts for 2 of the 3 failing tests.
- `RemoveSuppressionResponseSuccess` › `basic` fails: after `remove`, the item is still listed. The
  path parameter there is `{suppression}`, not `{id}`.

`generate` already warns `flow-step-unreachable` for both of these, but the warning is buried in
several hundred lines of log output. Repeating warnings in a short summary at the end of the run
would make them hard to miss.

### 5. npm scope uses the origin without lowercasing it

Setting `origin` to my GitHub username `Taimoo-r` produced the package name
`@Taimoo-r/resend-sdk`, which npm rejects because scopes must be lowercase. GitHub URLs are
case-insensitive, so lowercasing the scope would be safe.

### 6. Defaults assume Voxgig owns the project

Until I set `main: kit: publisher` in `project.aontu`, the output had `origin: 'voxgig-sdk'`,
`Copyright (c) 2026 Voxgig` in `LICENSE`, and Voxgig as the package author. The setting is well
documented in the sdkgen model comments, but there is no `create-sdkgen` flag for it. An `--org` /
`--publisher` flag would help contributors who keep the copyright, as this brief intends.

### 7. Docs drift: `.aon` vs `.aontu`

voxgig.com/sdk/docs/create-sdkgen refers to `.sdk/model/project.aon` and
`.sdk/model/entity/planet.aon`. The scaffold produces `.aontu` files, and the create-sdkgen
`AGENTS.md` says sdkgen 4.25+ refuses an `.aon` entry.

## What worked well

- **Speed:** once running, `npm run generate` takes about 8 seconds for 113 operations.
- **Error messages:** the `--no-install` guidance, and aontu's full search-path list, which made
  issue 2 diagnosable in about a minute.
- **Test suite:** the generated suite (641 tests, including executing every README snippet)
  caught real doc bugs immediately.
- **Comments:** `project.aontu` explains why it is included last and what error you would see
  otherwise. That kind of comment saves hours.
- **Windows-safe build:** `ts/package.json` cleans with `node -e rmSync` rather than `rm -rf`.
  `.sdk/package.json` still uses `rm -rf` and `bash` for `clean` and `status`.

## Where I stopped

- TypeScript target only.
- Regrouped only `Segment`. Contact, Template, Broadcast, Topic, Domain and others still need the
  same guide treatment.
- Did not fix the `ReceivedEmail` or suppression issues, and did not run a live send.

## Changes from the generated defaults

- `.sdk/model/sdk.aontu` and `.sdk/test/test.aontu`: `./` prefixes (issue 2), `origin: 'taimoo-r'`.
- `.sdk/model/guide/guide.aontu`: segment regrouping (issue 3).
- `.sdk/model/project.aontu`: `main: kit: publisher`.
- `.gitignore`: also ignores `.env`.
