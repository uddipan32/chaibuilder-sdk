# ChaiBuilder Core — AI Skills

AI skill files for ChaiBuilder Core consumers. Loaded into agent context to guide code generation when extending or integrating with ChaiBuilder Core.

## Structure

```
chaibuilder/
├── SKILL.md          ← compact summary + quick reference (loaded into AI context)
├── AGENTS.md         ← compiled full content with all rules and examples (generated)
├── README.md         ← this file
├── metadata.json     ← version, sections, abstract
└── rules/
    ├── _sections.md  ← section definitions and prefixes
    ├── _template.md  ← template for new rules
    ├── extend-ui-*.md        ← Extend Builder UI rules
    ├── blocks-*.md           ← Custom Blocks rules (planned)
    ├── server-*.md           ← Server Setup rules (planned)
    └── render-*.md           ← Page Rendering rules (planned)
```

## Sections

| Section | Prefix | Status |
|---|---|---|
| Extend Builder UI | `extend-ui-` | ✅ Complete |
| Custom Blocks | `blocks-` | 🔲 Planned |
| Server Setup | `server-` | 🔲 Planned |
| Page Rendering | `render-` | 🔲 Planned |

## Adding a New Rule

1. Copy `rules/_template.md` → `rules/<prefix>-<description>.md`
2. Choose the correct section prefix from `rules/_sections.md`
3. Fill in frontmatter (`title`, `impact`, `tags`) and content
4. Add a clear **Incorrect** and **Correct** example
5. Rebuild `AGENTS.md` by concatenating all rule files in section order

## Adding a New Section

1. Add the section to `rules/_sections.md`
2. Add to `metadata.json` sections array
3. Update the table in `SKILL.md`

## File Naming

- `_` prefix = special file (excluded from compilation)
- Rule files: `<section-prefix>-<short-description>.md`
  - e.g. `extend-ui-sidebar-panel.md`, `blocks-register-props.md`
- Rules within a section are sorted alphabetically

## Impact Levels

- `HIGH` — Core pattern; always do this
- `MEDIUM` — Common extension point; do when relevant
- `LOW` — Edge case or advanced use
