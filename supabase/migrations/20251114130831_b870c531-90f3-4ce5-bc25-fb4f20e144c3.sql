-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prize TEXT NOT NULL,
  round TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create draws table
CREATE TABLE public.draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  winner_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_re_spin BOOLEAN DEFAULT false,
  seed TEXT
);

-- Create user_roles table for admin management
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Anyone can view active sessions"
  ON public.sessions FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage all sessions"
  ON public.sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Participants policies
CREATE POLICY "Anyone can view participants"
  ON public.participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add participants"
  ON public.participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage participants"
  ON public.participants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Draws policies
CREATE POLICY "Anyone can view draws"
  ON public.draws FOR SELECT
  USING (true);

CREATE POLICY "Admins can create draws"
  ON public.draws FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for participants (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Create indexes for better performance
CREATE INDEX idx_participants_session_id ON public.participants(session_id);
CREATE INDEX idx_draws_session_id ON public.draws(session_id);
CREATE INDEX idx_sessions_code ON public.sessions(code);
CREATE INDEX idx_sessions_active ON public.sessions(active);