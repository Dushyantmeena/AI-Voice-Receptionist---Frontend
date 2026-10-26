import { describe, expect, it } from "vitest";
import { findNavItem, NAV_BY_ROLE } from "@/constants/navigation";
import { PATHS } from "@/routes/paths";

describe("findNavItem", () => {
  it("matches a dashboard root only exactly", () => {
    expect(findNavItem("BUSINESS_ADMIN", PATHS.dashboard)?.label).toBe("Overview");
    expect(findNavItem("BUSINESS_ADMIN", `${PATHS.dashboard}/appointments`)?.label).toBe("Appointments");
  });

  it("picks the longest matching path", () => {
    expect(findNavItem("SUPERADMIN", PATHS.adminBusiness("bus_123"))?.label).toBe("Businesses");
    expect(findNavItem("STAFF", PATHS.staffSchedule)?.label).toBe("My schedule");
  });

  it("returns null when the path is outside the role navigation", () => {
    expect(findNavItem("SUPERADMIN", PATHS.dashboard)).toBeNull();
    expect(findNavItem("BUSINESS_ADMIN", "/unknown")).toBeNull();
  });
});

describe("NAV_BY_ROLE", () => {
  it("gives every role its own navigation", () => {
    const roles = Object.keys(NAV_BY_ROLE);
    expect(roles).toEqual(["SUPERADMIN", "BUSINESS_ADMIN", "STAFF"]);
    expect(NAV_BY_ROLE.STAFF[0]?.items.every((item) => item.to.startsWith("/staff"))).toBe(true);
    expect(NAV_BY_ROLE.BUSINESS_ADMIN.flatMap((section) => section.items).every((item) =>
      item.to.startsWith("/dashboard"),
    )).toBe(true);
  });
});
