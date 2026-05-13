# Conventional Commits — Worked Examples

Verbatim examples from the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) spec, plus a few common patterns. The workflow lives in [SKILL.md](SKILL.md); the full grammar lives in [REFERENCE.md](REFERENCE.md).

## Breaking change via footer

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

## Breaking change via `!` marker

```
feat!: send an email to the customer when a product is shipped
```

## Breaking change with scope

```
feat(api)!: send an email to the customer when a product is shipped
```

## Breaking change with both `!` and footer

```
feat!: drop support for Node 6

BREAKING CHANGE: use JavaScript features not available in Node 6.
```

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
Co-authored-by: A. Developer <a.dev@example.com>
Reviewed-by: B. Reviewer
```
