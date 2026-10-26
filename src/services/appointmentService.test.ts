import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/api/axiosInstance", () => mocks);

const { appointmentService } = await import("@/services/appointmentService");

function appointment(id: string, startTime: string): Appointment {
  return {
    id,
    businessId: "bus_demo",
    customerId: "cus_demo",
    staffId: "stf_demo",
    serviceId: "svc_demo",
    startTime,
    endTime: startTime,
    status: "BOOKED",
    notes: null,
    createdAt: startTime,
    updatedAt: startTime,
  };
}

describe("appointmentService.list", () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it("fills in pagination metadata when the API omits it", async () => {
    mocks.get.mockResolvedValueOnce({ success: true, data: [appointment("a1", "2026-10-01T09:00:00.000Z")] });

    const page = await appointmentService.list({ page: 1, limit: 10 });

    expect(page.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });
});

describe("appointmentService.listNewestFirst", () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it("maps a UI page onto the matching backend page and sorts newest first", async () => {
    mocks.get
      .mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { page: 1, limit: 1, total: 25, totalPages: 25 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          appointment("older", "2026-10-01T09:00:00.000Z"),
          appointment("newer", "2026-10-30T09:00:00.000Z"),
        ],
        meta: { page: 2, limit: 10, total: 25, totalPages: 3 },
      });

    const result = await appointmentService.listNewestFirst({ page: 2, limit: 10 });

    // Page 2 of 3 pages (newest first) is backend page 2 of an ascending list.
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/appointments", { page: 1, limit: 1 });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/appointments", { page: 2, limit: 10 });
    expect(result.data.map((row) => row.id)).toEqual(["newer", "older"]);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });

  it("reads page 1 from the final backend page", async () => {
    mocks.get
      .mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { page: 1, limit: 1, total: 25, totalPages: 25 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { page: 3, limit: 10, total: 25, totalPages: 3 },
      });

    await appointmentService.listNewestFirst({ limit: 10 });

    expect(mocks.get).toHaveBeenNthCalledWith(2, "/appointments", { page: 3, limit: 10 });
  });

  it("passes filters through to both requests", async () => {
    mocks.get
      .mockResolvedValueOnce({ success: true, data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ success: true, data: [] });

    const result = await appointmentService.listNewestFirst({
      page: 1,
      limit: 20,
      staffId: "stf_demo",
      status: "BOOKED",
    });

    expect(mocks.get).toHaveBeenNthCalledWith(1, "/appointments", {
      page: 1,
      limit: 1,
      staffId: "stf_demo",
      status: "BOOKED",
    });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/appointments", {
      page: 1,
      limit: 20,
      staffId: "stf_demo",
      status: "BOOKED",
    });
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});
