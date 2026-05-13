# Effort scale

Use this rubric to assign an effort level from 1-5 to each issue. The scale reflects how much reasoning, exploration, and design judgement the issue requires — NOT how many lines of code it produces.

## How to assign a level

For each level, count how many of its four checklist items describe this issue. Pick the level with the highest count. **If two levels tie, pick the higher one** — under-routing to a less capable model is more costly than over-routing.

Every level's four items track the same four dimensions, in this order. All four are evaluated from the PRD, the issue text, and the issue set — NOT from deep codebase exploration.

1. **Scope** — files and modules the issue claims to touch (read from the issue text)
2. **Layers** — architectural layers crossed: schema, API/service, UI, infra. Tests share the layer of the code they cover and do NOT count as a separate layer.
3. **Design judgement** — how much the issue text leaves open for the implementer to decide
4. **Unknowns** — research or investigation the issue text itself flags as needed

## 1 — Trivial

A fully-specified mechanical change. Every decision is already made; the agent only has to execute.

- [ ] Scope: 1-2 files in the same area
- [ ] Layers: stays within a single layer
- [ ] Design: every decision is spelled out in the issue text
- [ ] Unknowns: codebase context not required to make the change

## 2 — Easy

Localized change requiring light reading of nearby code. The path forward is obvious once context is loaded.

- [ ] Scope: a handful of files within one module
- [ ] Layers: stays within a single layer
- [ ] Design: only obvious local choices remain (naming, ordering, simple validation)
- [ ] Unknowns: only light reading of nearby code required

## 3 — Moderate

Multi-layer change that requires some local design work and pattern adaptation.

- [ ] Scope: several files, possibly across two modules
- [ ] Layers: crosses two layers (e.g. schema + API, or API + UI)
- [ ] Design: a few small design decisions (data shape, error handling, ordering of effects)
- [ ] Unknowns: at most one small unknown that a targeted lookup resolves

## 4 — Hard

Complex change with non-trivial design work and broader codebase awareness, but still within a known architecture.

- [ ] Scope: multiple modules or non-adjacent files
- [ ] Layers: crosses three or more layers, OR two layers with non-trivial integration
- [ ] Design: edge cases and failure modes need explicit reasoning
- [ ] Unknowns: one or two unknowns to resolve through investigation before implementing

## 5 — Very hard

Architecture-level work, cross-cutting concerns, or significant unknowns. Reserve for issues that truly need the strongest reasoning model.

- [ ] Scope: cross-cutting — touches code throughout the system, or modifies core shared modules
- [ ] Layers: spans most or all layers, OR affects shared concerns (auth, data integrity, performance, migrations, concurrency)
- [ ] Design: architecture-level decisions with ripple effects across modules
- [ ] Unknowns: multiple unknowns requiring research, prototyping, or external docs
