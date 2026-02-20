# Templates Guide

This folder contains SDLC documentation templates for product, engineering, and support workflows.

## When to Use Each Template

### `PRODUCT_SPEC_TEMPLATE.md`
Use when:
- Starting a new feature
- Changing user workflows
- Proposing meaningful behavior changes

Outcome:
- Clear scope, requirements, risks, guardrails, and success metrics.

### `RELEASE_NOTES_TEMPLATE.md`
Use when:
- Preparing any release to users or internal stakeholders

Outcome:
- Structured release summary with operational steps and rollback notes.

### `HELP_CENTER_STRUCTURE.md`
Use when:
- Creating or reorganizing user help content
- Launching new features that users must learn

Outcome:
- Consistent help center structure with guides, troubleshooting, and responsible-use content.

### `DOCS_DEFINITION_OF_DONE.md`
Use when:
- Opening or reviewing implementation PRs
- Running release readiness checks

Outcome:
- Documentation quality gate that prevents incomplete releases.

## Suggested Workflow
1. Start feature with `PRODUCT_SPEC_TEMPLATE.md`.
2. Build and test implementation.
3. Update help content using `HELP_CENTER_STRUCTURE.md`.
4. Validate against `DOCS_DEFINITION_OF_DONE.md`.
5. Publish with `RELEASE_NOTES_TEMPLATE.md`.

## Ownership Recommendation
- Product Manager: product spec and user-facing messaging.
- Engineering Lead: technical accuracy and rollout/rollback steps.
- Support/Success: help center clarity and troubleshooting quality.

## Versioning Best Practice
- Keep documentation changes in the same PR as code when possible.
- Track doc updates in release notes and changelog.
- Add last-updated date and owner in each finalized document.
