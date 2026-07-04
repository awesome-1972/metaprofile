import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PricingPage from "./pages/PricingPage";
import MethodologyPage from "./pages/MethodologyPage";
import UniquenessPage from "./pages/UniquenessPage";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyCaseCreate from "./pages/company/CompanyCaseCreate";
import CompanyCandidates from "./pages/company/CompanyCandidates";
import CompanyAnalytics from "./pages/company/CompanyAnalytics";
import CompanyVacancies from "./pages/company/CompanyVacancies";
import CompanyCases from "./pages/company/CompanyCases";
import CompanyInternRequests from "./pages/company/CompanyInternRequests";
import CompanyVirtualInterview from "./pages/company/CompanyVirtualInterview";
import ProfessionalDashboard from "./pages/professional/ProfessionalDashboard";
import ProfessionalCaseWork from "./pages/professional/ProfessionalCaseWork";
import ProfessionalAssessments from "./pages/professional/ProfessionalAssessments";
import ProfessionalLearning from "./pages/professional/ProfessionalLearning";
import ProfessionalProfile from "./pages/professional/ProfessionalProfile";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentOrientation from "./pages/student/StudentOrientation";
import StudentProfessions from "./pages/student/StudentProfessions";
import StudentInternship from "./pages/student/StudentInternship";
import StudentProfile from "./pages/student/StudentProfile";
import VeteranDashboard from "./pages/veteran/VeteranDashboard";
import VeteranSkills from "./pages/veteran/VeteranSkills";
import VeteranAdaptation from "./pages/veteran/VeteranAdaptation";
import VeteranProfile from "./pages/veteran/VeteranProfile";
import VeteranSupport from "./pages/veteran/VeteranSupport";
import VeteranSimulation from "./pages/veteran/VeteranSimulation";
import CandidateInterviewPage from "./pages/shared/CandidateInterviewPage";
 
 // V2 imports
 import AuthPageV2 from "./pages/v2/AuthPage";
 import DemoRegistrationPage from "./pages/v2/DemoRegistrationPage";
 import CompanyDashboardV2 from "./pages/v2/CompanyDashboard";
 import CandidateDashboardV2 from "./pages/v2/CandidateDashboard";
 import AdminDashboardV2 from "./pages/v2/AdminDashboard";
 import CaseWorkPage from "./pages/v2/CaseWorkPage";
 import { ProtectedRoute } from "./components/v2/ProtectedRoute";

const queryClient = new QueryClient();

const DemoGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isRegistered = localStorage.getItem("demo_registered") === "true";
  if (!isRegistered && location.pathname !== "/demo" && !location.pathname.startsWith("/v2")) {
    return <Navigate to="/demo" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DemoGate>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/uniqueness" element={<UniquenessPage />} />
          
          {/* Company routes */}
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/cases/create" element={<CompanyCaseCreate />} />
          <Route path="/company/candidates" element={<CompanyCandidates />} />
          <Route path="/company/vacancies" element={<CompanyVacancies />} />
          <Route path="/company/cases" element={<CompanyCases />} />
          <Route path="/company/interns" element={<CompanyInternRequests />} />
          <Route path="/company/interviews" element={<CompanyVirtualInterview />} />
          <Route path="/company/analytics" element={<CompanyAnalytics />} />
          
          {/* Professional routes */}
          <Route path="/professional" element={<ProfessionalDashboard />} />
          <Route path="/professional/cases/:id" element={<ProfessionalCaseWork />} />
          <Route path="/professional/cases" element={<ProfessionalDashboard />} />
          <Route path="/professional/assessments" element={<ProfessionalAssessments />} />
          <Route path="/professional/learning" element={<ProfessionalLearning />} />
          <Route path="/professional/profile" element={<ProfessionalProfile />} />
          <Route path="/professional/interview" element={<CandidateInterviewPage role="professional" />} />
          <Route path="/professional/analytics" element={<ProfessionalDashboard />} />
          
          {/* Student routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/orientation" element={<StudentOrientation />} />
          <Route path="/student/professions" element={<StudentProfessions />} />
          <Route path="/student/internship" element={<StudentInternship />} />
          <Route path="/student/interview" element={<CandidateInterviewPage role="student" />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/feedback" element={<StudentDashboard />} />
          
          {/* Veteran routes */}
          <Route path="/veteran" element={<VeteranDashboard />} />
          <Route path="/veteran/skills" element={<VeteranSkills />} />
          <Route path="/veteran/matching" element={<VeteranDashboard />} />
          <Route path="/veteran/adaptation" element={<VeteranAdaptation />} />
          <Route path="/veteran/support" element={<VeteranSupport />} />
          <Route path="/veteran/simulation" element={<VeteranSimulation />} />
          <Route path="/veteran/profile" element={<VeteranProfile />} />
          <Route path="/veteran/interview" element={<CandidateInterviewPage role="veteran" />} />
          <Route path="/veteran/internship" element={<VeteranDashboard />} />
          
         {/* V2 Routes */}
          <Route path="/demo" element={<DemoRegistrationPage />} />
          <Route path="/v2/auth" element={<AuthPageV2 />} />
         <Route path="/v2/auth/callback" element={<AuthPageV2 />} />
         <Route 
           path="/v2/company" 
           element={
             <ProtectedRoute allowedRoles={["company", "admin"]}>
               <CompanyDashboardV2 />
             </ProtectedRoute>
           } 
         />
         <Route
           path="/v2/candidate"
           element={
             <ProtectedRoute allowedRoles={["candidate", "admin"]}>
               <CandidateDashboardV2 />
             </ProtectedRoute>
           }
         />
         <Route
           path="/v2/candidate/cases/:id"
           element={
             <ProtectedRoute allowedRoles={["candidate", "admin"]}>
               <CaseWorkPage />
             </ProtectedRoute>
           }
         />
         <Route
           path="/v2/admin"
           element={
             <ProtectedRoute allowedRoles={["admin"]}>
               <AdminDashboardV2 />
             </ProtectedRoute>
           }
         />
 
          <Route path="*" element={<NotFound />} />
        </Routes>
        </DemoGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
