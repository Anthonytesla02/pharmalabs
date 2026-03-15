
-- Create drugs table (public, no auth needed for this MVP)
CREATE TABLE public.drugs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  drug_group TEXT,
  indications TEXT,
  contraindications TEXT,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  times_tested INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  last_tested TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth for this app)
CREATE POLICY "Anyone can read drugs" ON public.drugs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert drugs" ON public.drugs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update drugs" ON public.drugs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete drugs" ON public.drugs FOR DELETE USING (true);

-- Create session_results table for tracking practice history
CREATE TABLE public.session_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID REFERENCES public.drugs(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL, -- 'brand_to_ingredient' or 'ingredient_to_brand'
  is_correct BOOLEAN NOT NULL,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read session_results" ON public.session_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert session_results" ON public.session_results FOR INSERT WITH CHECK (true);

-- Create user_stats table for gamification
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_answered INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_stats" ON public.user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_stats" ON public.user_stats FOR UPDATE USING (true);

-- Insert default stats row
INSERT INTO public.user_stats (total_xp) VALUES (0);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_drugs_updated_at BEFORE UPDATE ON public.drugs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
