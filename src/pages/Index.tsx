import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Play, BarChart3 } from "lucide-react";
import DrugLab from "@/components/DrugLab";
import PracticeSession from "@/components/PracticeSession";
import Dashboard from "@/components/Dashboard";

interface Drug {
  id: string;
  brand_name: string;
  active_ingredient: string;
  drug_group: string | null;
  indications: string | null;
  contraindications: string | null;
  mastery_score: number;
  times_tested: number;
  times_correct: number;
}

export default function Index() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [activeTab, setActiveTab] = useState("lab");

  const fetchDrugs = useCallback(async () => {
    const { data } = await supabase
      .from("drugs")
      .select("id, brand_name, active_ingredient, drug_group, indications, contraindications, mastery_score, times_tested, times_correct")
      .order("created_at", { ascending: false });
    if (data) setDrugs(data as Drug[]);
  }, []);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FlaskConical className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">Pharmalabs</h1>
            <p className="text-xs text-muted-foreground">{drugs.length} drugs in database</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-lg mx-auto px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsContent value="lab">
            <DrugLab drugs={drugs} onRefresh={fetchDrugs} />
          </TabsContent>
          <TabsContent value="practice">
            <PracticeSession drugs={drugs} onRefresh={fetchDrugs} />
          </TabsContent>
          <TabsContent value="stats">
            <Dashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="container max-w-lg mx-auto">
          <TabsList className="w-full h-14 bg-transparent rounded-none grid grid-cols-3 p-0" asChild>
            <div className="flex">
              <button
                onClick={() => setActiveTab("lab")}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-14 transition-colors ${activeTab === "lab" ? "text-primary" : "text-muted-foreground"}`}
              >
                <FlaskConical className="h-5 w-5" />
                <span className="text-[10px] font-medium">Lab</span>
              </button>
              <button
                onClick={() => setActiveTab("practice")}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-14 transition-colors ${activeTab === "practice" ? "text-primary" : "text-muted-foreground"}`}
              >
                <Play className="h-5 w-5" />
                <span className="text-[10px] font-medium">Practice</span>
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-14 transition-colors ${activeTab === "stats" ? "text-primary" : "text-muted-foreground"}`}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-[10px] font-medium">Stats</span>
              </button>
            </div>
          </TabsList>
        </div>
      </nav>
    </div>
  );
}
