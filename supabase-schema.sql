-- Enable Row Level Security on auth.users (if not already enabled)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    name = NEW.raw_user_meta_data->>'name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- =============================================
-- STARS CURRENCY SYSTEM
-- =============================================

-- User stars table (tracks current star balance)
CREATE TABLE public.user_stars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For anonymous users (privacy-safe)
  stars INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(anonymous_id)
);

-- Daily claims table (tracks daily star claims)
CREATE TABLE public.daily_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For anonymous users (privacy-safe)
  claim_date DATE DEFAULT CURRENT_DATE NOT NULL,
  stars_claimed INTEGER DEFAULT 5 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, claim_date),
  UNIQUE(anonymous_id, claim_date)
);

-- Ad watches table (tracks ad views for stars)
CREATE TABLE public.ad_watches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For anonymous users (privacy-safe)
  watch_date DATE DEFAULT CURRENT_DATE NOT NULL,
  ad_count INTEGER DEFAULT 1 NOT NULL,
  stars_earned INTEGER DEFAULT 2 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table (tracks referral relationships)
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id),
  UNIQUE(referral_code)
);

-- Social shares table (tracks social media shares)
CREATE TABLE public.social_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For anonymous users (privacy-safe)
  platform TEXT NOT NULL, -- 'facebook', 'twitter', 'instagram', etc.
  share_url TEXT,
  stars_earned INTEGER DEFAULT 2 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Star transactions table (audit trail for all star movements)
CREATE TABLE public.star_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For anonymous users (privacy-safe)
  transaction_type TEXT NOT NULL, -- 'daily_claim', 'ad_watch', 'social_share', 'referral', 'reading_cost', 'referral_reward'
  amount INTEGER NOT NULL, -- positive for earning, negative for spending
  description TEXT,
  reference_id UUID, -- Reference to related table (daily_claims.id, ad_watches.id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all stars tables
ALTER TABLE public.user_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stars
CREATE POLICY "Users can view own stars" ON public.user_stars
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own stars" ON public.user_stars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stars" ON public.user_stars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_claims
CREATE POLICY "Users can view own daily claims" ON public.daily_claims
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own daily claims" ON public.daily_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ad_watches
CREATE POLICY "Users can view own ad watches" ON public.ad_watches
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own ad watches" ON public.ad_watches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- RLS Policies for social_shares
CREATE POLICY "Users can view own social shares" ON public.social_shares
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own social shares" ON public.social_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for star_transactions
CREATE POLICY "Users can view own star transactions" ON public.star_transactions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own star transactions" ON public.star_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to get or create user stars
CREATE OR REPLACE FUNCTION public.get_or_create_user_stars(p_user_id UUID DEFAULT NULL, p_anonymous_id TEXT DEFAULT NULL)
RETURNS TABLE(stars INTEGER) AS $$
DECLARE
  current_stars INTEGER;
BEGIN
  -- Try to get existing stars
  IF p_user_id IS NOT NULL THEN
    SELECT us.stars INTO current_stars
    FROM public.user_stars us
    WHERE us.user_id = p_user_id;
  ELSIF p_anonymous_id IS NOT NULL THEN
    SELECT us.stars INTO current_stars
    FROM public.user_stars us
    WHERE us.anonymous_id = p_anonymous_id;
  END IF;

  -- If no stars found, create new record with initial stars
  IF current_stars IS NULL THEN
    BEGIN
      -- Give initial stars: 10 for logged-in users, 5 for anonymous users
      DECLARE
        initial_stars INTEGER := CASE WHEN p_user_id IS NOT NULL THEN 10 ELSE 5 END;
      BEGIN
        INSERT INTO public.user_stars (user_id, anonymous_id, stars)
        VALUES (p_user_id, p_anonymous_id, initial_stars)
        RETURNING user_stars.stars INTO current_stars;
        
        -- Record the initial stars as a daily claim
        INSERT INTO public.daily_claims (user_id, anonymous_id, stars_claimed)
        VALUES (p_user_id, p_anonymous_id, initial_stars);
        
        -- Record the transaction
        INSERT INTO public.star_transactions (
          user_id, anonymous_id, transaction_type, amount, description
        ) VALUES (
          p_user_id, p_anonymous_id, 'daily_claim', initial_stars, 
          CASE WHEN p_user_id IS NOT NULL THEN 'Initial daily stars for logged-in user' ELSE 'Initial daily stars for anonymous user' END
        );
      END;
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a conflict, try to get the existing record
        IF p_user_id IS NOT NULL THEN
          SELECT us.stars INTO current_stars
          FROM public.user_stars us
          WHERE us.user_id = p_user_id;
        ELSIF p_anonymous_id IS NOT NULL THEN
          SELECT us.stars INTO current_stars
          FROM public.user_stars us
          WHERE us.anonymous_id = p_anonymous_id;
        END IF;
    END;
  END IF;

  RETURN QUERY SELECT current_stars;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add stars to user
CREATE OR REPLACE FUNCTION public.add_stars(
  p_user_id UUID DEFAULT NULL,
  p_anonymous_id TEXT DEFAULT NULL,
  p_amount INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'manual',
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Update user stars - handle conflicts properly
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.user_stars (user_id, anonymous_id, stars)
    VALUES (p_user_id, p_anonymous_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET 
      stars = user_stars.stars + p_amount,
      updated_at = NOW();
  ELSIF p_anonymous_id IS NOT NULL THEN
    INSERT INTO public.user_stars (user_id, anonymous_id, stars)
    VALUES (p_user_id, p_anonymous_id, p_amount)
    ON CONFLICT (anonymous_id) DO UPDATE SET 
      stars = user_stars.stars + p_amount,
      updated_at = NOW();
  END IF;

  -- Get new balance
  SELECT stars INTO new_balance
  FROM public.user_stars
  WHERE (p_user_id IS NOT NULL AND user_id = p_user_id) 
     OR (p_anonymous_id IS NOT NULL AND anonymous_id = p_anonymous_id);

  -- Record transaction
  INSERT INTO public.star_transactions (
    user_id, anonymous_id, transaction_type, amount, description, reference_id
  ) VALUES (
    p_user_id, p_anonymous_id, p_transaction_type, p_amount, p_description, p_reference_id
  );

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can claim daily stars
CREATE OR REPLACE FUNCTION public.can_claim_daily_stars(p_user_id UUID DEFAULT NULL, p_anonymous_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  claim_exists BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.daily_claims 
      WHERE user_id = p_user_id AND claim_date = CURRENT_DATE
    ) INTO claim_exists;
  ELSIF p_anonymous_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.daily_claims 
      WHERE anonymous_id = p_anonymous_id AND claim_date = CURRENT_DATE
    ) INTO claim_exists;
  END IF;

  RETURN NOT claim_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check daily ad watch limit
CREATE OR REPLACE FUNCTION public.get_daily_ad_watch_count(p_user_id UUID DEFAULT NULL, p_anonymous_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  watch_count INTEGER := 0;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ad_count), 0) INTO watch_count
    FROM public.ad_watches 
    WHERE user_id = p_user_id AND watch_date = CURRENT_DATE;
  ELSIF p_anonymous_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ad_count), 0) INTO watch_count
    FROM public.ad_watches 
    WHERE anonymous_id = p_anonymous_id AND watch_date = CURRENT_DATE;
  END IF;

  RETURN watch_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get today's daily claim amount
CREATE OR REPLACE FUNCTION public.get_today_daily_claim_amount(p_user_id UUID DEFAULT NULL, p_anonymous_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
	claimed INTEGER := 0;
BEGIN
	IF p_user_id IS NOT NULL THEN
		SELECT COALESCE(stars_claimed, 0) INTO claimed
		FROM public.daily_claims
		WHERE user_id = p_user_id AND claim_date = CURRENT_DATE
		LIMIT 1;
	ELSIF p_anonymous_id IS NOT NULL THEN
		SELECT COALESCE(stars_claimed, 0) INTO claimed
		FROM public.daily_claims
		WHERE anonymous_id = p_anonymous_id AND claim_date = CURRENT_DATE
		LIMIT 1;
	END IF;
	RETURN COALESCE(claimed, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic daily claim function to avoid race conditions
CREATE OR REPLACE FUNCTION public.claim_daily_stars(p_user_id UUID DEFAULT NULL, p_anonymous_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
	stars_to_give INTEGER := CASE WHEN p_user_id IS NOT NULL THEN 10 ELSE 5 END;
	new_balance INTEGER;
BEGIN
	-- Check if already claimed today
	IF NOT public.can_claim_daily_stars(p_user_id, p_anonymous_id) THEN
		-- Return current balance without adding
		SELECT stars INTO new_balance
		FROM public.user_stars
		WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
		   OR (p_anonymous_id IS NOT NULL AND anonymous_id = p_anonymous_id)
		LIMIT 1;
		RETURN COALESCE(new_balance, 0);
	END IF;

	-- Add stars
	new_balance := public.add_stars(p_user_id, p_anonymous_id, stars_to_give, 'daily_claim',
		CASE WHEN p_user_id IS NOT NULL THEN 'Daily stars claim (logged-in)'
		     ELSE 'Daily stars claim (anonymous)'
		END,
		NULL);

	-- Record daily claim
	INSERT INTO public.daily_claims (user_id, anonymous_id, stars_claimed)
	VALUES (p_user_id, p_anonymous_id, stars_to_give);

	RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;