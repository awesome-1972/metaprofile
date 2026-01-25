import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PricingPage from "./pages/PricingPage";
import MethodologyPage from "./pages/MethodologyPage";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyCaseCreate from "./pages/company/CompanyCaseCreate";
import CompanyCandidates from "./pages/company/CompanyCandidates";
import CompanyAnalytics from "./pages/company/CompanyAnalytics";
import ProfessionalDashboard from "./pages/professional/ProfessionalDashboard";
import ProfessionalCaseWork from "./pages/professional/ProfessionalCaseWork";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentOrientation from "./pages/student/StudentOrientation";
import StudentProfessions from "./pages/student/StudentProfessions";
import VeteranDashboard from "./pages/veteran/VeteranDashboard";
import VeteranSkills from "./pages/veteran/VeteranSkills";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          
          {/* Company routes */}
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/cases/create" element={<CompanyCaseCreate />} />
          <Route path="/company/candidates" element={<CompanyCandidates />} />
          <Route path="/company/vacancies" element={<CompanyDashboard />} />
          <Route path="/company/cases" element={<CompanyDashboard />} />
          <Route path="/company/analytics" element={<CompanyAnalytics />} />
          
          {/* Professional routes */}
          <Route path="/professional" element={<ProfessionalDashboard />} />
          <Route path="/professional/cases/:id" element={<ProfessionalCaseWork />} />
          <Route path="/professional/cases" element={<ProfessionalDashboard />} />
          <Route path="/professional/assessments" element={<ProfessionalDashboard />} />
          <Route path="/professional/learning" element={<ProfessionalDashboard />} />
          <Route path="/professional/analytics" element={<ProfessionalDashboard />} />
          
          {/* Student routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/orientation" element={<StudentOrientation />} />
          <Route path="/student/professions" element={<StudentProfessions />} />
          <Route path="/student/internship" element={<StudentDashboard />} />
          <Route path="/student/feedback" element={<StudentDashboard />} />
          
          {/* Veteran routes */}
          <Route path="/veteran" element={<VeteranDashboard />} />
          <Route path="/veteran/skills" element={<VeteranSkills />} />
          <Route path="/veteran/matching" element={<VeteranDashboard />} />
          <Route path="/veteran/adaptation" element={<VeteranDashboard />} />
          <Route path="/veteran/internship" element={<VeteranDashboard />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
