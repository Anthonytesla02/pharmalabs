import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

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

interface PracticeSessionProps {
  drugs: Drug[];
  onRefresh: () => void;
}

type QuestionType = "brand_to_ingredient" | "ingredient_to_brand";

interface Question {
  drug: Drug;
  type: QuestionType;
  prompt: string;
  answer: string;
}

export default function PracticeSession({ drugs, onRefresh }: PracticeSessionProps) {
  const [sessionActive, setSessionActive] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);

  const generateSession = useCallback(() => {
    if (drugs.length < 2) {
      toast.error("Add at least 2 drugs to start practicing");
      return;
    }

    // Sort by mastery (prioritize unlearned), take max 50%
    const sorted = [...drugs].sort((a, b) => a.mastery_score - b.mastery_score);
    const sessionSize = Math.max(1, Math.floor(drugs.length * 0.5));
    const selected = sorted.slice(0, sessionSize);

    // Generate questions: mix of brand→ingredient and ingredient→brand
    const qs: Question[] = selected.map((drug) => {
      const type: QuestionType = Math.random() > 0.5 ? "brand_to_ingredient" : "ingredient_to_brand";
      return {
        drug,
        type,
        prompt: type === "brand_to_ingredient" ? drug.brand_name : drug.active_ingredient,
        answer: type === "brand_to_ingredient" ? drug.active_ingredient : drug.brand_name,
      };
    });

    // Shuffle
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]];
    }

    setQuestions(qs);
    setCurrentIndex(0);
    setUserAnswer("");
    setFeedback(null);
    setSessionScore(0);
    setSessionCorrect(0);
    setSessionTotal(0);
    setIsComplete(false);
    setSessionActive(true);
  }, [drugs]);

  const checkAnswer = async () => {
    if (!userAnswer.trim() || feedback) return;

    const current = questions[currentIndex];
    const isCorrect = userAnswer.trim().toLowerCase() === current.answer.toLowerCase();
    const points = isCorrect ? 10 : -5;

    setFeedback(isCorrect ? "correct" : "incorrect");
    setSessionScore((s) => s + points);
    setSessionTotal((t) => t + 1);
    if (isCorrect) setSessionCorrect((c) => c + 1);
    if (!isCorrect) {
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 300);
    }

    // Record result
    await supabase.from("session_results").insert({
      drug_id: current.drug.id,
      question_type: current.type,
      is_correct: isCorrect,
      user_answer: userAnswer.trim(),
      correct_answer: current.answer,
      points_earned: points,
    });

    // Update drug mastery
    const newMastery = Math.max(0, Math.min(100, current.drug.mastery_score + (isCorrect ? 10 : -5)));
    await supabase.from("drugs").update({
      mastery_score: newMastery,
      times_tested: current.drug.times_tested + 1,
      times_correct: current.drug.times_correct + (isCorrect ? 1 : 0),
      last_tested: new Date().toISOString(),
    }).eq("id", current.drug.id);

    // Update global stats
    const { data: stats } = await supabase.from("user_stats").select("*").limit(1).single();
    if (stats) {
      await supabase.from("user_stats").update({
        total_xp: stats.total_xp + points,
        total_correct: stats.total_correct + (isCorrect ? 1 : 0),
        total_answered: stats.total_answered + 1,
        current_streak: isCorrect ? stats.current_streak + 1 : 0,
        best_streak: isCorrect ? Math.max(stats.best_streak, stats.current_streak + 1) : stats.best_streak,
      }).eq("id", stats.id);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setIsComplete(true);
      // Increment session count
      supabase.from("user_stats").select("*").limit(1).single().then(({ data }) => {
        if (data) {
          supabase.from("user_stats").update({ total_sessions: data.total_sessions + 1 }).eq("id", data.id);
        }
      });
      onRefresh();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setUserAnswer("");
    setFeedback(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (feedback) nextQuestion();
      else checkAnswer();
    }
  };

  if (!sessionActive) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-16 space-y-6">
        <div className="card-surface p-8 text-center max-w-sm w-full space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Play className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Practice Session</h2>
          <p className="text-sm text-muted-foreground">
            Test your recall of {drugs.length} drug{drugs.length !== 1 ? "s" : ""}.
            Up to {Math.max(1, Math.floor(drugs.length * 0.5))} will be selected.
          </p>
          <Button onClick={generateSession} disabled={drugs.length < 2} className="w-full h-11">
            Start Session
          </Button>
          {drugs.length < 2 && (
            <p className="text-xs text-destructive">Add at least 2 drugs to practice</p>
          )}
        </div>
      </div>
    );
  }

  if (isComplete) {
    const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-16 space-y-6">
        <div className="card-surface p-8 text-center max-w-sm w-full space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Session Complete!</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{sessionScore}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sessionCorrect}/{sessionTotal}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateSession} className="flex-1 h-11 gap-2">
              <RotateCcw className="h-4 w-4" /> Again
            </Button>
            <Button variant="outline" onClick={() => setSessionActive(false)} className="flex-1 h-11">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];

  return (
    <div className="animate-fade-in flex flex-col items-center py-8 space-y-6 max-w-md mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {questions.length}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {sessionScore} XP
        </span>
      </div>

      {/* Card */}
      <div className={`card-surface p-6 w-full space-y-4 ${shakeCard ? "animate-shake" : ""} ${feedback === "correct" ? "ring-2 ring-success/30" : ""}`}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {current.type === "brand_to_ingredient" ? "What is the active ingredient?" : "What is the brand name?"}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {current.prompt}
        </p>

        {current.drug.drug_group && (
          <p className="text-xs text-muted-foreground">
            Hint: {current.drug.drug_group}
          </p>
        )}

        <Input
          placeholder="Type your answer..."
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!!feedback}
          autoFocus
          autoComplete="off"
          className="h-12 text-base font-mono-clinical"
        />

        {feedback === "incorrect" && (
          <div className="flex items-center gap-2 text-destructive animate-fade-in">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">
              Correct: <span className="font-mono-clinical font-semibold">{current.answer}</span>
            </span>
          </div>
        )}

        {feedback === "correct" && (
          <div className="flex items-center gap-2 text-success animate-fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-semibold">Correct! +10 XP</span>
          </div>
        )}

        {!feedback ? (
          <Button onClick={checkAnswer} disabled={!userAnswer.trim()} className="w-full h-11">
            Check
          </Button>
        ) : (
          <Button onClick={nextQuestion} className="w-full h-11">
            {currentIndex + 1 >= questions.length ? "Finish" : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
}
