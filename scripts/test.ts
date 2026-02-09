import "dotenv/config";

const BASE = "http://localhost:3000";
const BOARD_ID = 18399238102;
const API_TOKEN = process.env.MONDAY_API_TOKEN!;

async function test() {
  console.log("=== 1. Health Check ===");
  const health = await fetch(`${BASE}/health`).then(r => r.json());
  console.log(health);

  console.log("\n=== 2. List Board Columns ===");
  const columns = await fetch(`${BASE}/configure/${BOARD_ID}/columns`).then(r => r.json());
  console.log("Date columns:", columns.dateColumns?.map((c: any) => `${c.id} (${c.title})`));
  console.log("Timeline columns:", columns.timelineColumns?.map((c: any) => `${c.id} (${c.title})`));

  console.log("\n=== 3. Configure Board Sync ===");
  const configResult = await fetch(`${BASE}/configure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardId: BOARD_ID,
      startDateColumnId: "date_mm0d2z6c",
      endDateColumnId: "date_mm0da1pw",
      timelineColumnId: "timerange_mm0d71pz",
      apiToken: API_TOKEN,
    }),
  }).then(r => r.json());
  console.log(configResult);

  console.log("\n=== 4. Verify Config Saved ===");
  const savedConfig = await fetch(`${BASE}/configure/${BOARD_ID}`).then(r => r.json());
  console.log(savedConfig);

  console.log("\n=== 5. Simulate Webhook: Start Date Changed on Project Alpha (item 11222810195) ===");
  const syncResult1 = await fetch(`${BASE}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: {
        userId: 98971504,
        boardId: BOARD_ID,
        pulseId: 11222810195,
        pulseName: "Project Alpha",
        columnId: "date_mm0d2z6c",
        columnType: "date",
        value: '{"date":"2026-03-01"}',
        previousValue: '{}',
        changedAt: Date.now(),
        triggerUuid: "test-uuid-1",
      },
    }),
  }).then(r => r.json());
  console.log("Sync result:", syncResult1);

  // Wait a bit, then check the item
  await new Promise(r => setTimeout(r, 2000));

  console.log("\n=== 6. Verify Timeline Updated on Monday.com ===");
  const verifyResp = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_TOKEN,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({
      query: `{ items(ids: [11222810195]) { name column_values { id type value text } } }`,
    }),
  }).then(r => r.json());

  const item = verifyResp.data?.items?.[0];
  if (item) {
    console.log(`Item: ${item.name}`);
    for (const col of item.column_values) {
      if (["date_mm0d2z6c", "date_mm0da1pw", "timerange_mm0d71pz"].includes(col.id)) {
        console.log(`  ${col.id}: ${col.text} (raw: ${col.value})`);
      }
    }
  }

  console.log("\n=== 7. Simulate Webhook: Start Date Changed on Project Beta (item 11222806557) ===");
  const syncResult2 = await fetch(`${BASE}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: {
        userId: 98971504,
        boardId: BOARD_ID,
        pulseId: 11222806557,
        pulseName: "Project Beta",
        columnId: "date_mm0d2z6c",
        columnType: "date",
        value: '{"date":"2026-04-10"}',
        previousValue: '{}',
        changedAt: Date.now(),
        triggerUuid: "test-uuid-2",
      },
    }),
  }).then(r => r.json());
  console.log("Sync result:", syncResult2);

  await new Promise(r => setTimeout(r, 2000));

  console.log("\n=== 8. Verify Project Beta Timeline ===");
  const verifyResp2 = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_TOKEN,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({
      query: `{ items(ids: [11222806557]) { name column_values { id type value text } } }`,
    }),
  }).then(r => r.json());

  const item2 = verifyResp2.data?.items?.[0];
  if (item2) {
    console.log(`Item: ${item2.name}`);
    for (const col of item2.column_values) {
      if (["date_mm0d2z6c", "date_mm0da1pw", "timerange_mm0d71pz"].includes(col.id)) {
        console.log(`  ${col.id}: ${col.text} (raw: ${col.value})`);
      }
    }
  }

  console.log("\n=== 9. Test Monday.com Challenge Verification ===");
  const challengeResult = await fetch(`${BASE}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: "test-challenge-token-abc123" }),
  }).then(r => r.json());
  console.log("Challenge response:", challengeResult);

  console.log("\n=== ALL TESTS COMPLETE ===");
}

test().catch(console.error);
