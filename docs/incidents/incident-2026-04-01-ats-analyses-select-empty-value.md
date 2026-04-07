<!-- UPDATE LOG -->
<!-- 2026-04-01 00:00:00 | Created — ATS Analyses page crash: Radix UI Select.Item empty string value -->

# INC-003 — ATS Analyses page crash: empty-string Select.Item value

| Field           | Value                                           |
| --------------- | ----------------------------------------------- |
| **Incident ID** | INC-003                                         |
| **Date**        | 2026-04-01                                      |
| **Severity**    | High                                            |
| **Status**      | Resolved                                        |
| **Component**   | `ATSAnalysisModal` — Target Market select field |
| **Environment** | Local dev (localhost:8080)                      |
| **Reporter**    | Ricardo Rivero                                  |
| **Resolver**    | Claude Code                                     |

## 1. Incident Summary

The `/analyses` route crashed with a React error boundary on page load. The error message was:

> A `<Select.Item />` must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.

The entire ATS Analyses page was replaced by the error boundary fallback ("Something went wrong"), making it completely inaccessible.

## 2. Timeline

| Time (approx)     | Event                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| 2026-04-01 ~00:00 | User navigates to `/analyses`; page crashes with Radix UI Select error       |
| 2026-04-01 ~00:05 | Root cause identified: `<SelectItem value="">` in `ATSAnalysisModal.tsx:142` |
| 2026-04-01 ~00:10 | Fix applied and verified                                                     |

## 3. Root Cause Analysis

In `src/components/ATSAnalysisModal.tsx`, the "Target Market" `<Select>` contained an item intended as a reset/placeholder option:

```tsx
<SelectItem value="">Auto-detect from job description</SelectItem>
```

Radix UI's `Select` component explicitly forbids empty-string `value` props on `SelectItem` because it uses `""` internally as the sentinel for "no selection / show placeholder". This causes an invariant violation that React catches and escalates to the nearest error boundary, crashing the whole page.

The field was added in PROD-10 (2026-03-30). The "auto-detect" intent was correct, but the implementation used `value=""` which conflicts with Radix UI's reserved value.

## 4. Impact

- **User impact:** All users were unable to access the ATS Analyses page. Any attempt to navigate to `/analyses` showed the error boundary.
- **Data impact:** None. No data was corrupted or lost.
- **Blast radius:** Limited to the `/analyses` route.

## 5. Actions Taken

1. Identified the offending `<SelectItem value="">` at line 142 of `ATSAnalysisModal.tsx`.
2. Replaced the empty string with the sentinel value `"auto"`.
3. Updated the `Select`'s `value` prop: `value={targetCountry || 'auto'}`.
4. Updated `onValueChange` to map `"auto"` back to `""` before storing in state: `(v) => setTargetCountry(v === 'auto' ? '' : v)`.
5. The mutation already handles the empty-string case: `target_country: targetCountry || undefined`, so no backend changes were needed.

## 6. Resolution

**Fix committed in `src/components/ATSAnalysisModal.tsx`.**
The "Auto-detect from job description" option now uses `value="auto"` as a non-empty sentinel. Selecting it sets `targetCountry` to `""`, which the mutation converts to `undefined` — preserving the original auto-detect behaviour.

## 7. Corrective Actions / Problem Record

| ID    | Action                                                                                                                | Owner | Due              |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ----- | ---------------- |
| CA-01 | Add a lint rule or review checklist item: any `<SelectItem value="">` is a bug — use a named sentinel string instead. | Dev   | Next code review |

## 8. Lessons Learned

- Radix UI `Select` reserves `""` as a special "empty/unselected" state. Never pass `value=""` to `SelectItem`. Use a named sentinel (e.g. `"none"`, `"auto"`, `"_default"`) and map it back in the change handler.
- Optional select fields that represent "no selection" should rely on the `placeholder` prop on `SelectValue`, not a dedicated item with an empty value.

## 9. References

- Radix UI Select docs: value must be a non-empty string
- `src/components/ATSAnalysisModal.tsx` — fix at lines 137–142
- PROD-10 (2026-03-30) — original commit that introduced the field
