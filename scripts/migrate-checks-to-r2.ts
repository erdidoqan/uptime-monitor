/**
 * Migration script to move existing monitor checks from D1 to R2
 * 
 * Usage:
 *   npx tsx scripts/migrate-checks-to-r2.ts
 * 
 * This script reads all monitor_checks from D1 and writes them to R2
 * in the daily file format.
 */

import { getD1Client } from '../lib/d1-client';
import { appendCheckToR2 } from '../lib/r2-client';

interface MonitorCheck {
  id: string;
  monitor_id: string;
  ts: number;
  status: 'up' | 'down';
  http_status: number | null;
  latency_ms: number;
  error: string | null;
}

async function migrateChecksToR2() {
  console.log('Starting migration from D1 to R2...');

  try {
    const db = getD1Client();

    // Get all monitor IDs
    const monitors = await db.queryAll<{ id: string }>(
      'SELECT DISTINCT id FROM monitors'
    );

    console.log(`Found ${monitors.length} monitors`);

    let totalChecks = 0;
    let migratedChecks = 0;
    let errors = 0;

    for (const monitor of monitors) {
      console.log(`\nProcessing monitor: ${monitor.id}`);

      // Get all checks for this monitor
      const checks = await db.queryAll<MonitorCheck>(
        `SELECT id, monitor_id, ts, status, http_status, latency_ms, error
         FROM monitor_checks
         WHERE monitor_id = ?
         ORDER BY ts ASC`,
        [monitor.id]
      );

      console.log(`  Found ${checks.length} checks`);

      for (const check of checks) {
        totalChecks++;
        try {
          await appendCheckToR2(check);
          migratedChecks++;
          if (migratedChecks % 100 === 0) {
            console.log(`  Migrated ${migratedChecks} checks...`);
          }
        } catch (error) {
          errors++;
          console.error(`  Error migrating check ${check.id}:`, error);
        }
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total checks: ${totalChecks}`);
    console.log(`Migrated: ${migratedChecks}`);
    console.log(`Errors: ${errors}`);
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateChecksToR2()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateChecksToR2 };

