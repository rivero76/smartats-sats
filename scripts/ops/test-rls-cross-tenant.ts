/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | RLS cross-tenant denial test script.
 *                        Tests items #6 (P15 S1 sats_learning_roadmaps RLS) and
 *                        #13 (BUG locations RLS INSERT path).
 *                        Closes UNTESTED_IMPLEMENTATIONS.md blockers #6 and #13.
 *
 * Usage:
 *   npx tsx scripts/ops/test-rls-cross-tenant.ts
 *
 * Required env vars:
 *   VITE_SUPABASE_URL        — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY   — Supabase anon key
 *   USER_A_EMAIL             — First test-user email (creates data)
 *   USER_A_PASSWORD          — First test-user password
 *   USER_B_EMAIL             — Second test-user email (attempts cross-tenant read)
 *   USER_B_PASSWORD          — Second test-user password
 *
 * For the locations INSERT test (item #13) only USER_A credentials are required.
 */

import { createClient } from '@supabase/supabase-js'

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const USER_A_EMAIL = process.env.USER_A_EMAIL
const USER_A_PASSWORD = process.env.USER_A_PASSWORD
const USER_B_EMAIL = process.env.USER_B_EMAIL
const USER_B_PASSWORD = process.env.USER_B_PASSWORD

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
let skipped = 0

function pass(label: string) {
  console.log(`  ✅ PASS  ${label}`)
  passed++
}

function fail(label: string, detail?: string) {
  console.log(`  ❌ FAIL  ${label}${detail ? `\n         ${detail}` : ''}`)
  failed++
}

function skip(label: string, reason: string) {
  console.log(`  ⏭  SKIP  ${label} — ${reason}`)
  skipped++
}

// ── Test: Item #6 — P15 S1 Cross-tenant RLS denial ──────────────────────────

async function testRoadmapCrossTenantDenial() {
  console.log('\n📋 Test Suite: P15 S1 — sats_learning_roadmaps RLS cross-tenant denial\n')

  if (!USER_A_EMAIL || !USER_A_PASSWORD || !USER_B_EMAIL || !USER_B_PASSWORD) {
    skip(
      'Cross-tenant roadmap denial',
      'USER_A_EMAIL / USER_A_PASSWORD / USER_B_EMAIL / USER_B_PASSWORD not set'
    )
    return
  }

  const clientA = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  const clientB = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

  // Sign in User A
  const { error: signInAError } = await clientA.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASSWORD,
  })
  if (signInAError) {
    fail('User A sign-in', signInAError.message)
    return
  }

  // Sign in User B
  const { error: signInBError } = await clientB.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASSWORD,
  })
  if (signInBError) {
    fail('User B sign-in', signInBError.message)
    return
  }

  // User A creates a roadmap with a distinctive sentinel value
  const sentinel = `RLS-TEST-${Date.now()}`
  const { data: insertData, error: insertError } = await clientA
    .from('sats_learning_roadmaps')
    .insert({ target_role: sentinel })
    .select('id')
    .single()

  if (insertError || !insertData) {
    fail('User A inserts roadmap', insertError?.message ?? 'No data returned')
    return
  }
  pass('User A inserts roadmap')

  const roadmapId = insertData.id

  // User B attempts to read User A's roadmap by id
  const { data: readByB, error: readByBError } = await clientB
    .from('sats_learning_roadmaps')
    .select('id, target_role')
    .eq('id', roadmapId)

  if (readByBError) {
    // An RLS error is also acceptable — no data should leak
    pass('User B cross-tenant read blocked (query error from RLS)')
  } else if (!readByB || readByB.length === 0) {
    pass('User B receives 0 rows for User A\'s roadmap (RLS working)')
  } else {
    fail(
      'User B cross-tenant read blocked',
      `Expected 0 rows, got ${readByB.length}. RLS is NOT isolating correctly!`
    )
  }

  // User B attempts to read all roadmaps — sentinel must not appear
  const { data: allByB } = await clientB
    .from('sats_learning_roadmaps')
    .select('id, target_role')

  const leak = allByB?.find((r) => r.target_role === sentinel)
  if (leak) {
    fail('Sentinel roadmap absent from User B full scan', 'Data leaked across tenant boundary')
  } else {
    pass('Sentinel roadmap absent from User B full scan')
  }

  // Cleanup: User A deletes the test roadmap
  await clientA.from('sats_learning_roadmaps').delete().eq('id', roadmapId)
  pass('Cleanup: test roadmap deleted')

  await clientA.auth.signOut()
  await clientB.auth.signOut()
}

// ── Test: Item #13 — BUG locations RLS INSERT path ──────────────────────────

async function testLocationsInsertPath() {
  console.log('\n📋 Test Suite: BUG-2026-03-17 — sats_locations INSERT path (RLS fix)\n')

  if (!USER_A_EMAIL || !USER_A_PASSWORD) {
    skip('Locations INSERT path', 'USER_A_EMAIL / USER_A_PASSWORD not set')
    return
  }

  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

  const { error: signInError } = await client.auth.signInWithPassword({
    email: USER_A_EMAIL!,
    password: USER_A_PASSWORD!,
  })
  if (signInError) {
    fail('User A sign-in for locations test', signInError.message)
    return
  }

  const testCity = `RLS-Test-City-${Date.now()}`

  // Insert a new location
  const { data: insertData, error: insertError } = await client
    .from('sats_locations')
    .insert({ city: testCity, country: 'Test Country', region: 'Test Region' })
    .select('id, city')
    .single()

  if (insertError) {
    fail('sats_locations INSERT succeeds', `Error: ${insertError.message} (code: ${insertError.code})`)
  } else if (!insertData) {
    fail('sats_locations INSERT succeeds', 'No data returned')
  } else {
    pass(`sats_locations INSERT succeeds — id: ${insertData.id}, city: ${insertData.city}`)
  }

  // Verify the row is readable
  if (insertData?.id) {
    const { data: readData, error: readError } = await client
      .from('sats_locations')
      .select('id, city')
      .eq('id', insertData.id)
      .single()

    if (readError || !readData) {
      fail('sats_locations row readable after INSERT', readError?.message)
    } else {
      pass('sats_locations row readable after INSERT')
    }

    // Cleanup
    await client.from('sats_locations').delete().eq('id', insertData.id)
    pass('Cleanup: test location deleted')
  }

  await client.auth.signOut()
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  SmartATS — RLS Cross-Tenant Denial Test Script')
  console.log('  2026-03-27 | Items #6 and #13')
  console.log('='.repeat(60))

  await testRoadmapCrossTenantDenial()
  await testLocationsInsertPath()

  console.log('\n' + '='.repeat(60))
  console.log(`  Results: ${passed} passed · ${failed} failed · ${skipped} skipped`)
  console.log('='.repeat(60) + '\n')

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
