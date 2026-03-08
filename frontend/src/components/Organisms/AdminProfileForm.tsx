import Breadcrumb from '../Atoms/Breadcrumb';
import ProfilePhotoUpload from '../Molecules/ProfilePhotoUpload';
import ProfileInfoForm from '../Molecules/ProfileInfoForm';
import AdminInfoSection from '../Molecules/AccountInfoSection';
import ChangePasswordSection from '../Molecules/ChangePasswordSection';
import AccountInfoSection from '../Molecules/AccountInfoSection';

type Props = {
  role?: 'Admin' | 'SuperAdmin';
  // We pass the role so AdminInfoSection knows which level to show
}

export default function AdminProfileForm({ role = 'Admin' }: Props) {
  return (
    <div>
      {/* Breadcrumb — different path for admin vs superadmin */}
      <Breadcrumb items={[
        {
          label: 'Dashboard',
          path: role === 'SuperAdmin' ? '/superadmin/dashboard' : '/dashboard',
          icon: '🏠'
        },
        { label: 'My Profile' },
      ]} />

      {/* Page title */}
      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        My Profile
      </h2>

      {/* 1 — Photo */}
      <ProfilePhotoUpload />

      {/* 2 — Personal Information (First Name, Last Name, Email) */}
      <ProfileInfoForm />

      {/* 3 — Admin Information ← EXTRA SECTION only for admin/superadmin */}
      <AdminInfoSection role={role} />

      {/* 4 — Change Password */}
      <ChangePasswordSection />

      {/* 5 — Account Information */}
      <AccountInfoSection />

      {/* 6 — Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          onClick={() => alert('Changes saved!')}
          style={{
            background: '#1a3a6b', color: 'white',
            border: 'none', borderRadius: 8,
            padding: '14px 40px', fontSize: 16,
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}