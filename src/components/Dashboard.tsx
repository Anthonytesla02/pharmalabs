import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Zap, Target, Flame } from "lucide-react";

interface Stats {
  total_xp: number;
  total_sessions: number;
  total_correct: number;
  total_answered: number;
  current_streak: number;
  best_streak: number;
}

function getRank(xp: number): { title: string; next: string; progress: number } {
  if (xp < 100) return { title: "Intern", next: "Resident", progress: (xp / 100) * 100 };
  if (xp < 500) return { title: "Resident", next: "Attending", progress: ((xp - 100) / 400) * 100 };
  if (xp < 1500) return { title: "Attending", next: "Specialist", progress: ((xp - 500) / 1000) * 100 };
  return { title: "Specialist", next: "—", progress: 100 };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    supabase.from("user_stats").select("*").limit(1).single().then(({ data }) => {
      if (data) setStats(data as Stats);
    });
  }, []);

  if (!stats) return null;

  const rank = getRank(stats.total_xp);
  const accuracy = stats.total_answered > 0 ? Math.round((stats.total_correct / stats.total_answered) * 100) : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Rank Card */}
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clinician Rank</p>
            <p className="text-xl font-bold text-foreground">{rank.title}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-primary">{stats.total_xp}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
        </div>
        {rank.next !== "—" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{rank.title}</span>
              <span>{rank.next}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${rank.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-surface p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Accuracy</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
          <p className="text-xs text-muted-foreground">{stats.total_correct}/{stats.total_answered}</p>
        </div>
        <div className="card-surface p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total_sessions}</p>
          <p className="text-xs text-muted-foreground">completed</p>
        </div>
        <div className="card-surface p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Current Streak</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.current_streak}</p>
          <p className="text-xs text-muted-foreground">in a row</p>
        </div>
        <div className="card-surface p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Best Streak</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.best_streak}</p>
          <p className="text-xs text-muted-foreground">record</p>
        </div>
      </div>
    </div>
  );
}
