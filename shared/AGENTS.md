# Shared Assets

## OVERVIEW
Shared resources between CLI and Flutter GUI: schemas and templates.

## STRUCTURE
```
shared/assets/
├── oh-my-opencode.schema.json    # Official oh-my-opencode schema
└── default-template.json          # Default profile template
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Schema file | `oh-my-opencode.schema.json` | AJV validation |
| Default profile | `default-template.json` | Init command template |

## CONVENTIONS
- **Schema sync**: Download from GitHub on init, fallback to bundled
- **Template**: Used for `init` command default profile
- **Asset access**: CLI reads via `utils/downloader.ts`

## ANTI-PATTERNS
- DON'T modify schema without updating GitHub URL in `init.ts`
- AVOID hardcoding template contents; load from file
