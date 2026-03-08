import { useState } from 'react';
import ClientTemplate from '../components/Templates/ClientTemplate';
import ClientProfileForm from '../components/Organisms/ClientProfileForm';

export default function ClientProfilePage() {
  const [activePage, setActivePage] = useState('Profile');

  return (
    <ClientTemplate activePage={activePage} onNavigate={setActivePage}>
      <ClientProfileForm />
    </ClientTemplate>
  );
}