import { useState } from 'react';
import ClientTemplate from '../components/Templates/ClientTemplate';
import NewTranscriptionForm from '../components/Organisms/NewTranscriptionForm';

export default function NewTranscriptionPage() {
  const [activePage, setActivePage] = useState('Transcriptions');

  return (
    <ClientTemplate activePage={activePage} onNavigate={setActivePage}>
      <NewTranscriptionForm />
    </ClientTemplate>
  );
}