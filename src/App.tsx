import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Feeds from "./pages/Feeds";
import Schedules from "./pages/Schedules";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Review from "./pages/Review";
import MasterAdmin from "./pages/MasterAdmin";
import Login from "./pages/Login";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import { WhiteLabelProvider } from "./hooks/useWhiteLabel";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { TrialGuard } from "./components/auth/TrialGuard";
import { useUserPresence } from "./hooks/useUserPresence";
import { useSessionWarning } from "./hooks/useSessionWarning";
import { NotificationManager } from "./components/notifications/NotificationManager";

const queryClient = new QueryClient();

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Monitor session expiration
  useSessionWarning();

  useEffect(() => {
    const handleInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        await processPendingRegistration(session.user);
      }

      setLoading(false);
    };

    handleInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user && _event === 'SIGNED_IN') {
        await processPendingRegistration(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const processPendingRegistration = async (user: any) => {
    const company = localStorage.getItem('pending_registration_company');
    if (!company) return;

    try {
      // Small delay to ensure database trigger has completed
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (memberData?.organization_id) {
        await supabase
          .from('organizations')
          .update({ name: company })
          .eq('id', memberData.organization_id);

        console.log('Organization updated successfully');
        localStorage.removeItem('pending_registration_company');
        localStorage.removeItem('pending_registration_name');
      }
    } catch (error) {
      console.error('Error processing pending registration:', error);
    }
  };

  // Track user presence
  useUserPresence(session?.user?.id);

  if (loading) return null;

  return (
    <>
      {session && <NotificationManager />}
      <Routes>
        <Route
          path="/"
          element={session ? <Index /> : <Navigate to="/login" />}
        />
        <Route
          path="/feeds"
          element={session ? <Feeds /> : <Navigate to="/login" />}
        />
        <Route
          path="/schedules"
          element={session ? <Schedules /> : <Navigate to="/login" />}
        />
        <Route
          path="/logs"
          element={session ? <Logs /> : <Navigate to="/login" />}
        />
        <Route
          path="/review"
          element={session ? <Review /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={session ? <Settings /> : <Navigate to="/login" />}
        />
        <Route
          path="/api-docs"
          element={session ? <ApiDocs /> : <Navigate to="/login" />}
        />
        <Route
          path="/master"
          element={session ? <MasterAdmin /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/" />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <WhiteLabelProvider>
            <SubscriptionProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppContent />
              </TooltipProvider>
            </SubscriptionProvider>
          </WhiteLabelProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
