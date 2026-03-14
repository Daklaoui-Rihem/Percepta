import { Home } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import ProfilePhotoUpload from '../Molecules/ProfilePhotoUpload';
import ProfileInfoForm from '../Molecules/ProfileInfoForm';
import ChangePasswordSection from '../Molecules/ChangePasswordSection';
import { useTranslation } from '../../context/TranslationContext';

export default function ClientProfileForm() {
  const { t } = useTranslation();

  return (
    <div>
      <Breadcrumb items={[
        { label: t('home'), path: '/client/dashboard', icon: Home },
        { label: t('myProfile') },
      ]} />

      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        {t('myProfile')}
      </h2>

      <ProfilePhotoUpload />
      <ProfileInfoForm />
      <ChangePasswordSection />
    </div>
  );
}