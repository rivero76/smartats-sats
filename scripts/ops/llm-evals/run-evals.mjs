#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = {
    input: 'scripts/ops/llm-evals/reports/latest.responses.json',
    output: 'scripts/ops/llm-evals/reports/latest.report.json',
    thresholds: 'scripts/ops/llm-evals/baselines/thresholds.json',
    gate: false,
    initTemplate: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--input') args.input = argv[++i]
    else if (token === '--output') args.output = argv[++i]
    else if (token === '--thresholds') args.thresholds = argv[++i]
    else if (token === '--gate') args.gate = true
    else if (token === '--init-template') args.initTemplate = true
  }
  return args
}

function safeReadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function clampRate(num, den) {
  if (!den) return 0
  return Number((num / den).toFixed(4))
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isUnitInterval(value) {
  return typeof value === 'number' && value >= 0 && value <= 1
}

function validateAtsRecord(record) {
  const output = record?.output
  if (!output || typeof output !== 'object') return { schemaValid: false, evidenceValid: false, breakdownValid: false }

  const schemaValid =
    isUnitInterval(output.match_score) &&
    isStringArray(output.keywords_found) &&
    isStringArray(output.keywords_missing) &&
    isStringArray(output.resume_warnings) &&
    isStringArray(output.recommendations) &&
    output.score_breakdown &&
    typeof output.score_breakdown === 'object' &&
    isUnitInterval(output.score_breakdown.skills_alignment) &&
    isUnitInterval(output.score_breakdown.experience_relevance) &&
    isUnitInterval(output.score_breakdown.domain_fit) &&
    isUnitInterval(output.score_breakdown.format_quality) &&
    Array.isArray(output.evidence)

  const evidenceValid =
    Array.isArray(output.evidence) &&
    output.evidence.length > 0 &&
    output.evidence.every((item) => {
      if (!item || typeof item !== 'object') return false
      return (
        typeof item.skill === 'string' &&
        item.skill.trim().length > 0 &&
        typeof item.jd_quote === 'string' &&
        item.jd_quote.trim().length > 0 &&
        typeof item.resume_quote === 'string' &&
        item.resume_quote.trim().length > 0 &&
        typeof item.reasoning === 'string' &&
        item.reasoning.trim().length > 0
      )
    })

  const breakdownValid =
    output.score_breakdown &&
    typeof output.score_breakdown === 'object' &&
    ['skills_alignment', 'experience_relevance', 'domain_fit', 'format_quality'].every((key) =>
      isUnitInterval(output.score_breakdown[key])
    )

  return { schemaValid, evidenceValid, breakdownValid }
}

function validateEnrichmentRecord(record) {
  const output = record?.output
  if (!output || typeof output !== 'object' || !Array.isArray(output.suggestions)) {
    return { schemaValid: false, evidenceValid: false, riskFlagValid: false }
  }

  const validSuggestion = (item) => {
    if (!item || typeof item !== 'object') return false
    const skillTypeOk = item.skill_type === 'explicit' || item.skill_type === 'inferred'
    const riskOk = item.risk_flag === 'low' || item.risk_flag === 'medium' || item.risk_flag === 'high'
    return (
      typeof item.skill_name === 'string' &&
      item.skill_name.trim().length > 0 &&
      skillTypeOk &&
      isUnitInterval(item.confidence) &&
      typeof item.explanation === 'string' &&
      item.explanation.trim().length > 0 &&
      typeof item.suggestion === 'string' &&
      item.suggestion.trim().length > 0 &&
      typeof item.source_resume_evidence === 'string' &&
      item.source_resume_evidence.trim().length > 0 &&
      riskOk
    )
  }

  const schemaValid = output.suggestions.length > 0 && output.suggestions.every(validSuggestion)
  const evidenceValid =
    output.suggestions.length > 0 &&
    output.suggestions.every(
      (item) => typeof item.source_resume_evidence === 'string' && item.source_resume_evidence.trim().length > 0
    )
  const riskFlagValid =
    output.suggestions.length > 0 &&
    output.suggestions.every((item) => ['low', 'medium', 'high'].includes(item.risk_flag))

  return { schemaValid, evidenceValid, riskFlagValid }
}

function buildTemplateResponse() {
  const atsCases = safeReadJson('scripts/ops/llm-evals/datasets/ats_cases.json')
  const enrichmentCases = safeReadJson('scripts/ops/llm-evals/datasets/enrichment_cases.json')

  return {
    generated_at: new Date().toISOString(),
    metadata: {
      workflow: 'manual_capture',
      notes: 'Populate output blocks with real model responses before running --gate.',
    },
    ats: atsCases.map((entry) => ({ case_id: entry.case_id, output: null })),
    enrichment: enrichmentCases.map((entry) => ({ case_id: entry.case_id, output: null })),
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function evaluate(args) {
  if (args.initTemplate) {
    const template = buildTemplateResponse()
    ensureDir(args.input)
    fs.writeFileSync(args.input, `${JSON.stringify(template, null, 2)}\n`)
    console.log(`Initialized eval response template: ${args.input}`)
    return 0
  }

  if (!fs.existsSync(args.input)) {
    console.error(`Input not found: ${args.input}`)
    console.error('Run with --init-template to generate a starter response file.')
    return 1
  }

  const responses = safeReadJson(args.input)
  const thresholds = safeReadJson(args.thresholds)

  const atsRecords = Array.isArray(responses.ats) ? responses.ats : []
  const enrichRecords = Array.isArray(responses.enrichment) ? responses.enrichment : []

  let schemaValidCount = 0
  let totalRecordCount = 0

  let atsEvidenceValidCount = 0
  let atsBreakdownValidCount = 0

  let enrichEvidenceValidCount = 0
  let enrichRiskFlagValidCount = 0

  for (const record of atsRecords) {
    totalRecordCount += 1
    const res = validateAtsRecord(record)
    if (res.schemaValid) schemaValidCount += 1
    if (res.evidenceValid) atsEvidenceValidCount += 1
    if (res.breakdownValid) atsBreakdownValidCount += 1
  }

  for (const record of enrichRecords) {
    totalRecordCount += 1
    const res = validateEnrichmentRecord(record)
    if (res.schemaValid) schemaValidCount += 1
    if (res.evidenceValid) enrichEvidenceValidCount += 1
    if (res.riskFlagValid) enrichRiskFlagValidCount += 1
  }

  const report = {
    generated_at: new Date().toISOString(),
    input_path: args.input,
    totals: {
      records: totalRecordCount,
      ats_records: atsRecords.length,
      enrichment_records: enrichRecords.length,
    },
    metrics: {
      schema_valid_rate: clampRate(schemaValidCount, totalRecordCount),
      ats_evidence_coverage_rate: clampRate(atsEvidenceValidCount, atsRecords.length),
      ats_score_breakdown_presence_rate: clampRate(atsBreakdownValidCount, atsRecords.length),
      enrichment_evidence_presence_rate: clampRate(enrichEvidenceValidCount, enrichRecords.length),
      enrichment_risk_flag_presence_rate: clampRate(enrichRiskFlagValidCount, enrichRecords.length),
    },
  }

  const failures = []
  if (report.metrics.schema_valid_rate < thresholds.schema_valid_rate_min) {
    failures.push(`schema_valid_rate ${report.metrics.schema_valid_rate} < ${thresholds.schema_valid_rate_min}`)
  }
  if (report.metrics.ats_evidence_coverage_rate < thresholds.ats.evidence_coverage_rate_min) {
    failures.push(
      `ats_evidence_coverage_rate ${report.metrics.ats_evidence_coverage_rate} < ${thresholds.ats.evidence_coverage_rate_min}`
    )
  }
  if (
    report.metrics.ats_score_breakdown_presence_rate <
    thresholds.ats.score_breakdown_presence_rate_min
  ) {
    failures.push(
      `ats_score_breakdown_presence_rate ${report.metrics.ats_score_breakdown_presence_rate} < ${thresholds.ats.score_breakdown_presence_rate_min}`
    )
  }
  if (
    report.metrics.enrichment_evidence_presence_rate <
    thresholds.enrichment.evidence_presence_rate_min
  ) {
    failures.push(
      `enrichment_evidence_presence_rate ${report.metrics.enrichment_evidence_presence_rate} < ${thresholds.enrichment.evidence_presence_rate_min}`
    )
  }
  if (
    report.metrics.enrichment_risk_flag_presence_rate <
    thresholds.enrichment.risk_flag_presence_rate_min
  ) {
    failures.push(
      `enrichment_risk_flag_presence_rate ${report.metrics.enrichment_risk_flag_presence_rate} < ${thresholds.enrichment.risk_flag_presence_rate_min}`
    )
  }

  report.gate = {
    pass: failures.length === 0,
    failures,
  }

  ensureDir(args.output)
  fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`)

  console.log(`Eval report written: ${args.output}`)
  console.log(JSON.stringify(report.metrics, null, 2))

  if (args.gate && failures.length > 0) {
    console.error('LLM eval gate failed:')
    failures.forEach((failure) => console.error(`- ${failure}`))
    return 1
  }

  return 0
}

const args = parseArgs(process.argv.slice(2))
const exitCode = evaluate(args)
process.exit(exitCode)
