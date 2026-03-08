import { useState } from 'react';
import ClientTemplate from '../components/Templates/ClientTemplate';
import NewVideoAnalysisForm from '../components/Organisms/NewVideoAnalysisForm';

export default function NewVideoAnalysisPage() {
  const [activePage, setActivePage] = useState('Video Analysis');

  return (
    <ClientTemplate activePage={activePage} onNavigate={setActivePage}>
      <NewVideoAnalysisForm />
    </ClientTemplate>
  );
}