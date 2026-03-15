import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PatientDashboardOverview from './pages/patient/PatientDashboardOverview';
import PatientCheckIn from './pages/patient/PatientCheckIn';
import PatientRiskAssessment from './pages/patient/PatientRiskAssessment';
import PatientDoctorReport from './pages/patient/PatientDoctorReport';
import PatientProfile from './pages/patient/PatientProfile';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorOverview from './pages/doctor/DoctorOverview';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorAIInsights from './pages/doctor/DoctorAIInsights';
import DoctorReports from './pages/doctor/DoctorReports';
import DoctorSettings from './pages/doctor/DoctorSettings';
import DoctorProfile from './pages/doctor/DoctorProfile';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="dashboard" element={<Dashboard />}>
            <Route index element={<PatientDashboardOverview />} />
            <Route path="check-in" element={<PatientCheckIn />} />
            <Route path="risk" element={<PatientRiskAssessment />} />
            <Route path="report" element={<PatientDoctorReport />} />
            <Route path="profile" element={<PatientProfile />} />
          </Route>
          <Route path="doctor" element={<DoctorDashboard />}>
            <Route index element={<DoctorOverview />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="insights" element={<DoctorAIInsights />} />
            <Route path="reports" element={<DoctorReports />} />
            <Route path="settings" element={<DoctorSettings />} />
            <Route path="profile" element={<DoctorProfile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
