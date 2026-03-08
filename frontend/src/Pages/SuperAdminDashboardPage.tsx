import SuperAdminTemplate from '../components/Templates/SuperAdminTemplate';
import SuperStatsRow from '../components/Organisms/SuperStatsRow';
import RealTimeChart from '../components/Organisms/RealTimeChart';
import ActiveTenantsList from '../components/Organisms/ActiveTenantsList';
import RecentActivityList from '../components/Organisms/RecentActivityList';

export default function SuperAdminDashboardPage() {
  return (
    <SuperAdminTemplate>
      <SuperStatsRow />
      <RealTimeChart />
      <ActiveTenantsList />
      <RecentActivityList />
    </SuperAdminTemplate>
  );
}