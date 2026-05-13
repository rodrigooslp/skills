# Conventional Commits 1.0.0 — Reference

Full spec rules for drafting a commit message. The workflow lives in [SKILL.md](SKILL.md); worked messages live in [EXAMPLES.md](EXAMPLES.md).

## Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

## Type

Required. Lowercase noun. Pick the one that best fits the dominant change:

| Type | Use for |
|------|---------|
| `feat` | A new feature (user-visible capability) |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace, missing semicolons — no code behavior change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system, dependencies, packaging |
| `ci` | CI configuration and scripts |
| `chore` | Maintenance that doesn't fit above (e.g. tooling, configs) |
| `revert` | Reverting a previous commit |

If multiple types apply, pick the one that describes the **primary** intent. Do **not** invent new types.

## Scope (optional)

A single lowercase noun in parentheses identifying the section of the codebase touched, e.g. `feat(parser):`. Omit if the change is broad or cross-cutting.

## Breaking change marker

If the commit introduces a breaking change, **either**:

- Add `!` immediately before the colon: `feat(api)!: drop legacy auth`, **or**
- Add a `BREAKING CHANGE: <description>` footer, **or**
- Both (preferred when the description alone doesn't capture the impact).

When `!` is used, `BREAKING CHANGE:` in the footer is optional.

## Description

Required. Comes after `: ` (colon + space). Rules:

- **Imperative, present tense.** Read as a command: "add", "fix", "remove", "rename" — **not** "added", "fixes", "removing".
- **Start with a verb.** Lowercase first letter unless it's a proper noun.
- **No trailing period.**
- Keep the whole header line under ~72 characters when possible.
- Be specific: `fix: handle null user in login` beats `fix: bug fix`.

## Body (optional)

- Separated from the description by **one blank line**.
- Free-form paragraphs explaining **why**, not what (the diff shows what).
- Wrap lines at ~72 characters for readability.
- Multiple paragraphs are fine, separated by blank lines.

## Footers (optional)

- Separated from the body (or description, if no body) by **one blank line**.
- One footer per line. Format: `Token: value` or `Token #value`.
- Token rules:
  - Use `-` in place of spaces, e.g. `Reviewed-by:`, `Co-authored-by:`, `Acked-by:`, `Refs:`, `Closes:`.
  - **Exception:** `BREAKING CHANGE` (uppercase, with a space) is allowed. `BREAKING-CHANGE` is also valid and synonymous.
- Multi-line footer values are allowed; parsing stops at the next valid footer token.
