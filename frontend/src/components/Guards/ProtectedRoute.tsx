// frontend/src/components/Guards/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { getSession } from '../../services/api';

type Props = {
    children: React.ReactNode;
    allowedRoles?: ('Client' | 'Admin' | 'SuperAdmin')[];
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
    const session = getSession();

    // Not logged in → go to login
    if (!session || !localStorage.getItem('token')) {
        return <Navigate to="/login" replace />;
    }

    // Role check
    if (allowedRoles && !allowedRoles.includes(session.role)) {
        // Redirect to their correct dashboard
        if (session.role === 'SuperAdmin') return <Navigate to="/superadmin/dashboard" replace />;
        if (session.role === 'Admin') return <Navigate to="/dashboard" replace />;
        return <Navigate to="/client/dashboard" replace />;
    }

    return <>{children}</>;
}