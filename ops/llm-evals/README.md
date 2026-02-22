# LLM Evals

Priority 10 introduces a release gate for prompt/model changes.

## Files

- `datasets/ats_cases.json`: ATS evaluation case registry.
- `datasets/enrichment_cases.json`: enrichment evaluation case registry.
- `baselines/thresholds.json`: minimum acceptance thresholds.
- `run-evals.mjs`: contract evaluator + gate runner.
- `reports/latest.responses.json`: input responses captured from model runs.
- `reports/template.responses.json`: starter template (null outputs) for new capture cycles.
- `reports/latest.report.json`: generated metrics and gate result.

## Quick start

1. Initialize a response template:

```bash
node ops/llm-evals/run-evals.mjs --init-template --input ops/llm-evals/reports/latest.responses.json
```

2. Fill `output` sections with real ATS/enrichment model responses.

3. Run eval report:

```bash
node ops/llm-evals/run-evals.mjs --input ops/llm-evals/reports/latest.responses.json
```

4. Run release gate:

```bash
bash ops/check-llm-evals.sh ops/llm-evals/reports/latest.responses.json
```

## Gate metrics

- `schema_valid_rate`
- `ats_evidence_coverage_rate`
- `ats_score_breakdown_presence_rate`
- `enrichment_evidence_presence_rate`
- `enrichment_risk_flag_presence_rate`

Thresholds are defined in `baselines/thresholds.json`.
