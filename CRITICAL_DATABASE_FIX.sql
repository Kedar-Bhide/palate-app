-- =====================================================================
-- CUISINE PROGRESS TRACKING - SUPABASE DATABASE SETUP
-- =====================================================================
-- This SQL script sets up the complete database schema for the enhanced
-- cuisine progress tracking system with all necessary tables, indexes,
-- triggers, and RLS policies.
-- =====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- CUISINES TABLE
-- =====================================================================

-- Create cuisines table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cuisines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    emoji VARCHAR(10),
    description TEXT,
    origin_country VARCHAR(100),
    popularity_score INTEGER DEFAULT 0,
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5) DEFAULT 3,
    spice_level INTEGER CHECK (spice_level >= 1 AND spice_level <= 5) DEFAULT 3,
    dietary_tags TEXT[], -- Array of dietary considerations (vegetarian, vegan, gluten-free, etc.)
    typical_ingredients TEXT[],
    signature_dishes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_cuisines_category ON public.cuisines(category);
CREATE INDEX IF NOT EXISTS idx_cuisines_origin_country ON public.cuisines(origin_country);
CREATE INDEX IF NOT EXISTS idx_cuisines_popularity ON public.cuisines(popularity_score DESC);

-- Update trigger for cuisines
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cuisines_updated_at ON public.cuisines;
CREATE TRIGGER update_cuisines_updated_at
    BEFORE UPDATE ON public.cuisines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- USER CUISINE PROGRESS TABLE
-- =====================================================================

-- Create user_cuisine_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_cuisine_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES public.cuisines(id) ON DELETE CASCADE,
    first_tried_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    times_tried INTEGER DEFAULT 1 CHECK (times_tried >= 1),
    favorite_restaurant VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    photos TEXT[], -- Array of photo URLs
    location_data JSONB, -- Store location where tried (lat, lng, address)
    dining_context VARCHAR(50), -- 'dine_in', 'takeout', 'delivery', 'homemade'
    companions INTEGER DEFAULT 1, -- Number of people dined with
    cost_range INTEGER CHECK (cost_range >= 1 AND cost_range <= 4), -- 1=Budget, 2=Moderate, 3=Expensive, 4=Very Expensive
    would_try_again BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of user and cuisine
    UNIQUE(user_id, cuisine_id)
);

-- Indexes for user_cuisine_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_cuisine_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_cuisine_id ON public.user_cuisine_progress(cuisine_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_first_tried ON public.user_cuisine_progress(first_tried_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_rating ON public.user_cuisine_progress(rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_tried_date ON public.user_cuisine_progress(user_id, first_tried_at DESC);

-- Update trigger for user_cuisine_progress
DROP TRIGGER IF EXISTS update_user_cuisine_progress_updated_at ON public.user_cuisine_progress;
CREATE TRIGGER update_user_cuisine_progress_updated_at
    BEFORE UPDATE ON public.user_cuisine_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- USER ACHIEVEMENTS TABLE
-- =====================================================================

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(255) NOT NULL,
    achievement_description TEXT,
    achievement_icon VARCHAR(10),
    threshold_value INTEGER,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of user and achievement
    UNIQUE(user_id, achievement_id)
);

-- Indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at DESC);

-- =====================================================================
-- USER GOALS TABLE
-- =====================================================================

-- Create user_goals table
CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- 'cuisine_count', 'category_diversity', 'monthly_target', etc.
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    deadline DATE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_goals
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_type ON public.user_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_user_goals_deadline ON public.user_goals(deadline);

-- Update trigger for user_goals
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER update_user_goals_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- CUISINE RECOMMENDATIONS TABLE
-- =====================================================================

-- Create cuisine_recommendations table for ML-based suggestions
CREATE TABLE IF NOT EXISTS public.cuisine_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cuisine_id INTEGER NOT NULL REFERENCES public.cuisines(id) ON DELETE CASCADE,
    recommendation_score DECIMAL(3,2) CHECK (recommendation_score >= 0 AND recommendation_score <= 1),
    recommendation_reason TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique combination of user and cuisine for current recommendations
    UNIQUE(user_id, cuisine_id)
);

-- Indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user_score ON public.cuisine_recommendations(user_id, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_generated_at ON public.cuisine_recommendations(generated_at DESC);

-- =====================================================================
-- SAMPLE CUISINE DATA
-- =====================================================================

-- Insert sample cuisine data if table is empty
INSERT INTO public.cuisines (name, category, emoji, description, origin_country, popularity_score, difficulty_level, spice_level, dietary_tags, typical_ingredients, signature_dishes) VALUES
-- Asian Cuisines
('Japanese', 'Asian', '🍣', 'Traditional Japanese cuisine emphasizing seasonal ingredients, precise preparation, and beautiful presentation', 'Japan', 95, 4, 2, ARRAY['pescatarian-friendly', 'gluten-free options'], ARRAY['rice', 'soy sauce', 'miso', 'seaweed', 'fish'], ARRAY['sushi', 'ramen', 'tempura', 'udon']),
('Chinese', 'Asian', '🥟', 'Diverse regional Chinese cooking styles with emphasis on balance, flavor, and technique', 'China', 90, 3, 3, ARRAY['vegetarian options', 'vegan options'], ARRAY['soy sauce', 'ginger', 'garlic', 'rice', 'noodles'], ARRAY['dim sum', 'fried rice', 'kung pao chicken', 'sweet and sour pork']),
('Thai', 'Asian', '🍜', 'Bold flavors combining sweet, sour, salty, and spicy elements with fresh herbs', 'Thailand', 85, 3, 4, ARRAY['vegetarian options', 'gluten-free options'], ARRAY['coconut milk', 'fish sauce', 'lime', 'chili', 'basil'], ARRAY['pad thai', 'green curry', 'tom yum soup', 'mango sticky rice']),
('Korean', 'Asian', '🍲', 'Fermented foods, bold flavors, and communal dining traditions', 'South Korea', 80, 3, 3, ARRAY['vegetarian options'], ARRAY['kimchi', 'gochujang', 'sesame oil', 'garlic', 'soy sauce'], ARRAY['bulgogi', 'bibimbap', 'Korean BBQ', 'kimchi jjigae']),
('Vietnamese', 'Asian', '🍲', 'Fresh herbs, light broths, and balanced flavors with French colonial influences', 'Vietnam', 75, 2, 3, ARRAY['gluten-free options'], ARRAY['fish sauce', 'rice noodles', 'fresh herbs', 'lime', 'chilies'], ARRAY['pho', 'banh mi', 'fresh spring rolls', 'bun bo hue']),
('Indian', 'Asian', '🍛', 'Complex spice blends, regional diversity, and rich vegetarian traditions', 'India', 88, 4, 4, ARRAY['vegetarian', 'vegan options', 'gluten-free options'], ARRAY['turmeric', 'cumin', 'coriander', 'garam masala', 'basmati rice'], ARRAY['curry', 'biryani', 'naan', 'samosas']),

-- European Cuisines
('Italian', 'European', '🍝', 'Regional Italian cooking emphasizing high-quality ingredients and simple preparations', 'Italy', 92, 2, 2, ARRAY['vegetarian options'], ARRAY['olive oil', 'tomatoes', 'basil', 'parmesan', 'pasta'], ARRAY['pizza', 'pasta carbonara', 'risotto', 'gelato']),
('French', 'European', '🥐', 'Sophisticated techniques, rich sauces, and culinary artistry', 'France', 87, 5, 2, ARRAY['vegetarian options'], ARRAY['butter', 'cream', 'wine', 'herbs', 'cheese'], ARRAY['coq au vin', 'croissants', 'bouillabaisse', 'crème brûlée']),
('Spanish', 'European', '🥘', 'Regional Spanish cooking with emphasis on seafood, rice dishes, and tapas culture', 'Spain', 78, 3, 2, ARRAY['pescatarian-friendly', 'gluten-free options'], ARRAY['olive oil', 'saffron', 'paprika', 'garlic', 'sherry'], ARRAY['paella', 'tapas', 'gazpacho', 'jamón ibérico']),
('Greek', 'European', '🫒', 'Mediterranean diet with olive oil, fresh vegetables, and grilled meats', 'Greece', 72, 2, 2, ARRAY['vegetarian options', 'gluten-free options'], ARRAY['olive oil', 'feta cheese', 'oregano', 'lemon', 'olives'], ARRAY['moussaka', 'souvlaki', 'Greek salad', 'baklava']),
('German', 'European', '🍺', 'Hearty comfort foods, artisanal breads, and beer culture', 'Germany', 65, 2, 1, ARRAY['vegetarian options'], ARRAY['sausages', 'potatoes', 'cabbage', 'bread', 'beer'], ARRAY['bratwurst', 'sauerkraut', 'pretzels', 'schnitzel']),

-- Latin American Cuisines
('Mexican', 'Latin American', '🌮', 'Indigenous ingredients with Spanish influences, complex sauces and bold flavors', 'Mexico', 85, 3, 3, ARRAY['vegetarian options', 'gluten-free options'], ARRAY['corn', 'beans', 'chili peppers', 'lime', 'cilantro'], ARRAY['tacos', 'mole', 'guacamole', 'enchiladas']),
('Brazilian', 'Latin American', '🍖', 'Portuguese influences with African and indigenous elements', 'Brazil', 70, 3, 2, ARRAY['gluten-free options'], ARRAY['black beans', 'cassava', 'coconut', 'palm oil', 'beef'], ARRAY['feijoada', 'churrasco', 'açaí bowls', 'pão de açúcar']),
('Peruvian', 'Latin American', '🐟', 'Fusion of indigenous, Spanish, Chinese, and Japanese influences', 'Peru', 68, 3, 3, ARRAY['pescatarian-friendly', 'gluten-free options'], ARRAY['quinoa', 'potatoes', 'aji peppers', 'lime', 'fish'], ARRAY['ceviche', 'lomo saltado', 'anticuchos', 'pisco sour']),
('Argentinian', 'Latin American', '🥩', 'Beef-centric cuisine with Italian influences and wine culture', 'Argentina', 67, 2, 2, ARRAY[], ARRAY['beef', 'chimichurri', 'wine', 'dulce de leche', 'empanadas'], ARRAY['asado', 'empanadas', 'milanesa', 'alfajores']),

-- Middle Eastern & African
('Lebanese', 'Middle Eastern', '🫓', 'Mediterranean Middle Eastern cuisine with fresh herbs and grains', 'Lebanon', 65, 2, 2, ARRAY['vegetarian', 'vegan options'], ARRAY['olive oil', 'tahini', 'bulgur', 'parsley', 'lemon'], ARRAY['hummus', 'tabbouleh', 'falafel', 'shawarma']),
('Turkish', 'Middle Eastern', '🍖', 'Ottoman cuisine blending European and Asian influences', 'Turkey', 63, 3, 2, ARRAY['vegetarian options'], ARRAY['yogurt', 'eggplant', 'lamb', 'bulgur', 'pistachios'], ARRAY['kebabs', 'baklava', 'dolmas', 'turkish delight']),
('Moroccan', 'African', '🍲', 'North African cuisine with Berber, Arab, and French influences', 'Morocco', 60, 4, 3, ARRAY['gluten-free options'], ARRAY['couscous', 'preserved lemons', 'olives', 'argan oil', 'ras el hanout'], ARRAY['tagine', 'couscous', 'pastilla', 'mint tea']),
('Ethiopian', 'African', '🍞', 'Unique East African cuisine with injera bread and complex spice blends', 'Ethiopia', 45, 3, 4, ARRAY['vegetarian', 'vegan options'], ARRAY['injera', 'berbere spice', 'lentils', 'teff', 'coffee'], ARRAY['doro wat', 'injera', 'kitfo', 'Ethiopian coffee ceremony'])

ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all user-specific tables
ALTER TABLE public.user_cuisine_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuisine_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for user_cuisine_progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_cuisine_progress;
CREATE POLICY "Users can view own progress" ON public.user_cuisine_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_cuisine_progress;
CREATE POLICY "Users can insert own progress" ON public.user_cuisine_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_cuisine_progress;
CREATE POLICY "Users can update own progress" ON public.user_cuisine_progress
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_cuisine_progress;
CREATE POLICY "Users can delete own progress" ON public.user_cuisine_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for user_goals
DROP POLICY IF EXISTS "Users can manage own goals" ON public.user_goals;
CREATE POLICY "Users can manage own goals" ON public.user_goals
    FOR ALL USING (auth.uid() = user_id);

-- Policies for cuisine_recommendations
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.cuisine_recommendations;
CREATE POLICY "Users can view own recommendations" ON public.cuisine_recommendations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recommendations" ON public.cuisine_recommendations;
CREATE POLICY "Users can update own recommendations" ON public.cuisine_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- Public read access to cuisines table (no RLS needed)
-- Users should be able to read all cuisines

-- =====================================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================================

-- Function to automatically update popularity score when progress is added
CREATE OR REPLACE FUNCTION update_cuisine_popularity()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase popularity score when someone tries a cuisine
    UPDATE public.cuisines 
    SET popularity_score = popularity_score + 1
    WHERE id = NEW.cuisine_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update popularity when progress is added
DROP TRIGGER IF EXISTS trigger_update_popularity ON public.user_cuisine_progress;
CREATE TRIGGER trigger_update_popularity
    AFTER INSERT ON public.user_cuisine_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_cuisine_popularity();

-- Function to auto-complete goals when target is reached
CREATE OR REPLACE FUNCTION check_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any goals are completed
    UPDATE public.user_goals
    SET 
        is_completed = true,
        completed_at = NOW()
    WHERE 
        user_id = NEW.user_id 
        AND is_completed = false
        AND current_value >= target_value;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check goal completion when progress is updated
DROP TRIGGER IF EXISTS trigger_check_goal_completion ON public.user_cuisine_progress;
CREATE TRIGGER trigger_check_goal_completion
    AFTER INSERT OR UPDATE ON public.user_cuisine_progress
    FOR EACH ROW
    EXECUTE FUNCTION check_goal_completion();

-- =====================================================================
-- UTILITY VIEWS
-- =====================================================================

-- View for user progress statistics
CREATE OR REPLACE VIEW user_progress_stats AS
SELECT 
    user_id,
    COUNT(*) as total_cuisines_tried,
    COUNT(DISTINCT (
        SELECT category 
        FROM public.cuisines 
        WHERE id = user_cuisine_progress.cuisine_id
    )) as categories_explored,
    AVG(rating)::numeric(3,2) as average_rating,
    SUM(times_tried) as total_tries,
    MIN(first_tried_at) as journey_started,
    MAX(first_tried_at) as last_cuisine_tried,
    COUNT(CASE WHEN first_tried_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as cuisines_this_month,
    COUNT(CASE WHEN would_try_again = true THEN 1 END) as would_try_again_count
FROM public.user_cuisine_progress
GROUP BY user_id;

-- View for cuisine statistics
CREATE OR REPLACE VIEW cuisine_stats AS
SELECT 
    c.id,
    c.name,
    c.category,
    c.popularity_score,
    COUNT(ucp.id) as times_tried_by_users,
    COUNT(DISTINCT ucp.user_id) as unique_users,
    AVG(ucp.rating)::numeric(3,2) as average_rating,
    COUNT(CASE WHEN ucp.would_try_again = true THEN 1 END) as positive_experiences
FROM public.cuisines c
LEFT JOIN public.user_cuisine_progress ucp ON c.id = ucp.cuisine_id
GROUP BY c.id, c.name, c.category, c.popularity_score;

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

-- Add a comment to track setup completion
COMMENT ON TABLE public.cuisines IS 'Enhanced cuisine progress tracking system - Setup completed';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Cuisine Progress Tracking Database Setup Complete!';
    RAISE NOTICE '📊 Tables created: cuisines, user_cuisine_progress, user_achievements, user_goals, cuisine_recommendations';
    RAISE NOTICE '🔒 Row Level Security policies applied';
    RAISE NOTICE '🚀 Sample cuisine data inserted';
    RAISE NOTICE '📈 Utility views and functions created';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Ready for enhanced cuisine tracking features:';
    RAISE NOTICE '   - Advanced progress analytics';
    RAISE NOTICE '   - Achievement system';
    RAISE NOTICE '   - Goal setting and tracking';
    RAISE NOTICE '   - ML-based recommendations';
    RAISE NOTICE '   - Offline sync support';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Your React Native app can now use the enhanced cuisine progress system!';
END $$;