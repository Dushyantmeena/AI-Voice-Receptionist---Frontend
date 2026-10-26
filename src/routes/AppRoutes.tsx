import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import type { Role } from "@/types/domain";

const LandingPage = lazy(() => import("@/pages/public/LandingPage"));
const ChatPage = lazy(() => import("@/pages/public/ChatPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const UnauthorizedPage = lazy(() => import("@/pages/auth/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("@/pages/auth/NotFoundPage"));

// SuperAdmin
const AdminOverviewPage = lazy(() => import("@/pages/admin/AdminOverviewPage"));
const AdminBusinessesPage = lazy(() => import("@/pages/admin/AdminBusinessesPage"));
const AdminBusinessCreatePage = lazy(() => import("@/pages/admin/AdminBusinessCreatePage"));
const AdminBusinessDetailPage = lazy(() => import("@/pages/admin/AdminBusinessDetailPage"));
const AdminConversationsPage = lazy(() => import("@/pages/admin/AdminConversationsPage"));
const AdminAccessPage = lazy(() => import("@/pages/admin/AdminAccessPage"));

// Business Admin
const BusinessOverviewPage = lazy(() => import("@/pages/business/BusinessOverviewPage"));
const AppointmentsPage = lazy(() => import("@/pages/business/AppointmentsPage"));
const StaffPage = lazy(() => import("@/pages/business/StaffPage"));
const ServicesPage = lazy(() => import("@/pages/business/ServicesPage"));
const CustomersPage = lazy(() => import("@/pages/business/CustomersPage"));
const AvailabilityPage = lazy(() => import("@/pages/business/AvailabilityPage"));
const ConversationsPage = lazy(() => import("@/pages/business/ConversationsPage"));
const BusinessProfilePage = lazy(() => import("@/pages/business/BusinessProfilePage"));

// Staff
const StaffOverviewPage = lazy(() => import("@/pages/staff/StaffOverviewPage"));
const StaffAppointmentsPage = lazy(() => import("@/pages/staff/StaffAppointmentsPage"));
const StaffSchedulePage = lazy(() => import("@/pages/staff/StaffSchedulePage"));
const StaffProfilePage = lazy(() => import("@/pages/staff/StaffProfilePage"));

function ProtectedShell({ roles }: { roles: Role[] }) {
  return (
    <RequireAuth roles={roles}>
      <AppLayout />
    </RequireAuth>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route path="/c/:businessId" element={<ChatPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedShell roles={["SUPERADMIN"]} />}>
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route path="/admin/businesses" element={<AdminBusinessesPage />} />
        <Route path="/admin/businesses/new" element={<AdminBusinessCreatePage />} />
        <Route path="/admin/businesses/:businessId" element={<AdminBusinessDetailPage />} />
        <Route path="/admin/conversations" element={<AdminConversationsPage />} />
        <Route path="/admin/access" element={<AdminAccessPage />} />
      </Route>

      <Route element={<ProtectedShell roles={["BUSINESS_ADMIN"]} />}>
        <Route path="/dashboard" element={<BusinessOverviewPage />} />
        <Route path="/dashboard/appointments" element={<AppointmentsPage />} />
        <Route path="/dashboard/staff" element={<StaffPage />} />
        <Route path="/dashboard/services" element={<ServicesPage />} />
        <Route path="/dashboard/customers" element={<CustomersPage />} />
        <Route path="/dashboard/availability" element={<AvailabilityPage />} />
        <Route path="/dashboard/conversations" element={<ConversationsPage />} />
        <Route path="/dashboard/profile" element={<BusinessProfilePage />} />
      </Route>

      <Route element={<ProtectedShell roles={["STAFF"]} />}>
        <Route path="/staff" element={<StaffOverviewPage />} />
        <Route path="/staff/appointments" element={<StaffAppointmentsPage />} />
        <Route path="/staff/schedule" element={<StaffSchedulePage />} />
        <Route path="/staff/profile" element={<StaffProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
