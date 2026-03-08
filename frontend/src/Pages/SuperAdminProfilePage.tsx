import SuperAdminTemplate from '../components/Templates/SuperAdminTemplate';
import AdminProfileForm from '../components/Organisms/AdminProfileForm';

export default function SuperAdminProfilePage() {
  return (
    <SuperAdminTemplate>
      <AdminProfileForm role="SuperAdmin" />
      {/*
        role="SuperAdmin" → AdminInfoSection shows
        "⭐ SuperAdmin — Highest Level" (read-only, cannot be changed)
      */}
    </SuperAdminTemplate>
  );
}