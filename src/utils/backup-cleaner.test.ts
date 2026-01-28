import { describe, expect, it, vi, beforeEach } from "vitest";
import * as path from "path";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import * as fs from "fs";
import { cleanOldBackups } from "./backup-cleaner";

describe("backup-cleaner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cleanOldBackups", () => {
    const backupsPath = path.normalize("/test/backups");

    it("returns 0 if backups directory does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(0);
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it("returns 0 if backups directory is empty", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(0);
    });

    it("does not delete files newer than 30 days", () => {
      const now = Date.now();
      const twentyDaysAgo = now - (20 * 24 * 60 * 60 * 1000);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["recent-backup.json"] as any);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        mtimeMs: twentyDaysAgo,
      } as fs.Stats);
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(0);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("deletes files older than 30 days", () => {
      const now = Date.now();
      const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["old-backup.json"] as any);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        mtimeMs: fortyDaysAgo,
      } as fs.Stats);
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(backupsPath, "old-backup.json"));
    });

    it("skips directories", () => {
      const now = Date.now();
      const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["subdir"] as any);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
        mtimeMs: fortyDaysAgo,
      } as fs.Stats);
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(0);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("deletes multiple old files and counts correctly", () => {
      const now = Date.now();
      const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);
      const fiftyDaysAgo = now - (50 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "old1.json",
        "old2.json",
        "recent.json",
      ] as any);
      
      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ isDirectory: () => false, mtimeMs: fortyDaysAgo } as fs.Stats)
        .mockReturnValueOnce({ isDirectory: () => false, mtimeMs: fiftyDaysAgo } as fs.Stats)
        .mockReturnValueOnce({ isDirectory: () => false, mtimeMs: tenDaysAgo } as fs.Stats);
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(2);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it("handles deletion errors gracefully", () => {
      const now = Date.now();
      const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "old1.json",
        "old2.json",
      ] as any);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        mtimeMs: fortyDaysAgo,
      } as fs.Stats);
      
      // First delete succeeds, second fails
      vi.mocked(fs.unlinkSync)
        .mockImplementationOnce(() => {})
        .mockImplementationOnce(() => { throw new Error("Permission denied"); });
      
      const result = cleanOldBackups(backupsPath);
      
      // Only counts successful deletions
      expect(result).toBe(1);
    });

    it("handles readdirSync errors gracefully", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation(() => { throw new Error("EACCES"); });
      
      const result = cleanOldBackups(backupsPath);
      
      expect(result).toBe(0);
    });
  });
});
