import * as fs from "fs";
import * as path from "path";

/**
 * Clean up old backup files in the specified directory.
 * Removes files older than retentionDays (defaults to 30 days).
 * 
 * Backup files are expected to have ISO timestamp prefix format:
 * YYYY-MM-DDTHH-MM-SS-sssZ__filename.json
 */
export function cleanOldBackups(backupsPath: string, retentionDays: number = 30): number {
  if (!fs.existsSync(backupsPath)) {
    return 0;
  }

  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffTime = now - retentionMs;

  let deletedCount = 0;

  try {
    const files = fs.readdirSync(backupsPath);

    for (const file of files) {
      const filePath = path.join(backupsPath, file);
      
      // Skip directories
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        continue;
      }

      // Check file modification time
      const mtime = stat.mtimeMs;
      if (mtime < cutoffTime) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch {
          // Ignore deletion errors for individual files
        }
      }
    }
  } catch {
    // Ignore errors reading the directory
  }

  return deletedCount;
}
