import { Home } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import ProfilePhotoUpload from '../Molecules/ProfilePhotoUpload';
import ProfileInfoForm from '../Molecules/ProfileInfoForm';
import ChangePasswordSection from '../Molecules/ChangePasswordSection';
import AccountInfoSection from '../Molecules/AccountInfoSection';

export default function ClientProfileForm() {
  return (
    <div>
      {/* Breadcrumb: Home > My Profile */}
      <Breadcrumb items={[
        { label: 'Home', path: '/client/dashboard', icon: Home },
        { label: 'My Profile' },
      ]} />

      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        My Profile
      </h2>

      {/* All sections stacked */}
      <ProfilePhotoUpload />
      <ProfileInfoForm />
      <ChangePasswordSection />
      <AccountInfoSection />

      {/* Save button bottom right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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