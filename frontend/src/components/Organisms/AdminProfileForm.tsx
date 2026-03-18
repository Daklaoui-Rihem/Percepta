import { Home } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import ProfilePhotoUpload from '../Molecules/ProfilePhotoUpload';
import ProfileInfoForm from '../Molecules/ProfileInfoForm';
import AdminInfoSection from '../Molecules/AccountInfoSection';
import ChangePasswordSection from '../Molecules/ChangePasswordSection';

import { useTranslation } from '../../context/TranslationContext';

type Props = {
  role?: 'Admin' | 'SuperAdmin';
}

export default function AdminProfileForm({ role = 'Admin' }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <Breadcrumb items={[
        {
          label: t('dashboard'),
          path: role === 'SuperAdmin' ? '/superadmin/dashboard' : '/dashboard',
          icon: Home
        },
        { label: t('myProfile') },
      ]} />

      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        {t('myProfile')}
      </h2>

      <ProfilePhotoUpload />
      <ProfileInfoForm />
      {role === 'SuperAdmin' && <AdminInfoSection role={role} />}
      <ChangePasswordSection />
      
      {/* Optionally AccountInfoSection if different. AdminInfoSection wraps AccountInfoSection logic in this app structure based on role. */}
    </div>
  );
}