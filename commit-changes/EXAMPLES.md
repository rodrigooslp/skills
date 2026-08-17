# Conventional Commits — Worked Examples

Verbatim examples from the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) spec, plus a few common patterns. The workflow lives in [SKILL.md](SKILL.md); the full grammar lives in [REFERENCE.md](REFERENCE.md).

## Docs-only change

```
docs: correct spelling of CHANGELOG
```

## Scoped feature

```
feat(lang): add Polish language
```

## Fix with body and footers

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

## Revert

```
revert: feat(lang): add Polish language

This reverts commit 1234567890abcdef.
```

## Multiple footers

```
fix(auth): refresh session token when claims expire

Closes: #482
Refs: #477
```

> Note the absence of attribution footers — see the "NO ATTRIBUTION, NO CO-AUTHORS" section in [SKILL.md](SKILL.md).
