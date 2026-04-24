import { describe, it, expect, vi, beforeEach } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import {
  updateContactRequestClassification,
  connectToDatabase,
  _resetCache,
} from "../db";
import { logger } from "../logger";

vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const dbMocks = {
  updateOne: vi.fn(),
  connect: vi.fn(),
  db: vi.fn(),
};

vi.mock("mongodb", async () => {
  const actual = await vi.importActual("mongodb");
  return {
    ...actual,
    MongoClient: vi.fn().mockImplementation(function () {
      return {
        connect: dbMocks.connect.mockResolvedValue(null),
        db: dbMocks.db.mockReturnValue({
          collection: vi.fn().mockReturnValue({
            updateOne: dbMocks.updateOne,
          }),
        }),
      };
    }),
  };
});

describe("MongoDB Operations", () => {
  const mockUri = "mongodb://mock-uri";
  const validId = new ObjectId().toHexString();

  beforeEach(() => {
    vi.clearAllMocks();
    _resetCache();

    dbMocks.updateOne.mockReset();
    dbMocks.connect.mockReset();
    dbMocks.db.mockReset();
  });

  describe("connectToDatabase", () => {
    it("should create a new client and connect if no cachedDb exists", async () => {
      const db = await connectToDatabase(mockUri);

      expect(MongoClient).toHaveBeenCalledWith(mockUri);
      expect(db).toBeDefined();
    });

    it("should return the cachedDb on subsequent calls", async () => {
      const db1 = await connectToDatabase(mockUri);
      const db2 = await connectToDatabase(mockUri);

      expect(db1).toBe(db2);
      expect(MongoClient).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateContactRequestClassification", () => {
    it("should return an error if the ID format is invalid", async () => {
      const result = await updateContactRequestClassification(
        { id: "invalid-id", classification: "SPAM", reason: "test" },
        mockUri
      );

      expect(result.success).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Invalid ID format received",
        expect.any(Object)
      );
    });

    it("should successfully update a record and log debug info", async () => {
      dbMocks.updateOne.mockResolvedValue({ matchedCount: 1 });

      const result = await updateContactRequestClassification(
        {
          id: validId,
          classification: "CRITICAL",
          reason: "Urgent issue",
        },
        mockUri
      );

      expect(result.success).toBe(true);
      expect(dbMocks.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) as ObjectId },
        { $set: { classification: "CRITICAL", reason: "Urgent issue" } }
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "Successfully updated existing record with AI classification."
      );
    });

    it("should log a warning if no record matched the ID", async () => {
      dbMocks.updateOne.mockResolvedValue({ matchedCount: 0 });

      const result = await updateContactRequestClassification(
        { id: validId, classification: "GENERAL", reason: "Standard" },
        mockUri
      );

      expect(result.success).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Could not find matching record"),
        expect.any(Object)
      );
    });

    it("should handle database errors gracefully", async () => {
      dbMocks.updateOne.mockRejectedValue(new Error("Connection timeout"));

      const result = await updateContactRequestClassification(
        {
          id: validId,
          classification: "SPAM",
          reason: "Testing DB error",
        },
        mockUri
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe("DB Update Error: Connection timeout");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle non-Error string throws gracefully", async () => {
      dbMocks.updateOne.mockRejectedValue("String error from driver");

      const result = await updateContactRequestClassification(
        { id: validId, classification: "SPAM", reason: "Test" },
        mockUri
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe(
        "DB Update Error: String error from driver"
      );
      expect(logger.error).toHaveBeenCalledWith("Database update failed", {
        error: new Error("String error from driver"),
      });
    });
  });
});
