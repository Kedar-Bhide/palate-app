/**
 * Sample Data Generation
 * Creates sample posts and data for first-time user experience
 */

import { supabase } from './supabase';
import { PostInsert } from './database.types';

export const createSamplePosts = async (userId: string): Promise<boolean> => {
  try {
    console.log('🍽️ Creating sample posts for first-time experience...');

    // First, check if we have cuisines in the database
    const { data: cuisines, error: cuisineError } = await supabase
      .from('cuisines')
      .select('id, name')
      .limit(10);

    if (cuisineError) {
      console.error('Error fetching cuisines:', cuisineError);
      return false;
    }

    if (!cuisines || cuisines.length === 0) {
      console.warn('No cuisines found in database. Please run the SQL setup first.');
      return false;
    }

    // Sample posts data
    const samplePosts: PostInsert[] = [
      {
        user_id: userId,
        restaurant_name: "Mama's Kitchen",
        cuisine_id: cuisines.find(c => c.name === 'Italian')?.id || cuisines[0]?.id,
        rating: 5,
        review_text: "Amazing homemade pasta! The carbonara was creamy perfection. This cozy little place feels like eating at your Italian grandmother's house.",
        location_name: "Downtown",
        dining_type: 'casual',
        image_urls: [],
        is_private: false
      },
      {
        user_id: userId,
        restaurant_name: "Tokyo Nights",
        cuisine_id: cuisines.find(c => c.name === 'Japanese')?.id || cuisines[1]?.id || cuisines[0]?.id,
        rating: 4,
        review_text: "Fresh sushi and great atmosphere. The salmon nigiri melted in my mouth. Definitely coming back to try more items from their extensive menu.",
        location_name: "Uptown District",
        dining_type: 'fine_dining',
        image_urls: [],
        is_private: false
      },
      {
        user_id: userId,
        restaurant_name: "Spice Garden",
        cuisine_id: cuisines.find(c => c.name === 'Indian')?.id || cuisines[2]?.id || cuisines[0]?.id,
        rating: 5,
        review_text: "Incredible flavors! The butter chicken was rich and creamy, and the naan bread was perfectly fluffy. Great vegetarian options too.",
        location_name: "India Town",
        dining_type: 'casual',
        image_urls: [],
        is_private: false
      },
      {
        user_id: userId,
        restaurant_name: "Le Petit Bistro",
        cuisine_id: cuisines.find(c => c.name === 'French')?.id || cuisines[3]?.id || cuisines[0]?.id,
        rating: 4,
        review_text: "Authentic French cuisine with a modern twist. The coq au vin was tender and flavorful. A bit pricey but worth it for special occasions.",
        location_name: "Arts District",
        dining_type: 'fine_dining',
        image_urls: [],
        is_private: false
      },
      {
        user_id: userId,
        restaurant_name: "Street Tacos Maya",
        cuisine_id: cuisines.find(c => c.name === 'Mexican')?.id || cuisines[4]?.id || cuisines[0]?.id,
        rating: 5,
        review_text: "Best tacos in the city! Al pastor was perfectly seasoned and the homemade tortillas were incredible. Great prices and generous portions.",
        location_name: "Food Truck Plaza",
        dining_type: 'street_food',
        image_urls: [],
        is_private: false
      }
    ];

    // Insert sample posts
    const { data: insertedPosts, error: postError } = await supabase
      .from('posts')
      .insert(samplePosts)
      .select();

    if (postError) {
      console.error('Error creating sample posts:', postError);
      return false;
    }

    console.log(`✅ Created ${insertedPosts?.length || 0} sample posts successfully`);
    
    // Trigger a slight delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;

  } catch (error) {
    console.error('Failed to create sample posts:', error);
    return false;
  }
};

export const checkAndCreateSampleContent = async (userId: string): Promise<boolean> => {
  try {
    // Check if user already has posts
    const { data: existingPosts, error } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking existing posts:', error);
      return false;
    }

    // If user has no posts, create sample content
    if (!existingPosts || existingPosts.length === 0) {
      console.log('🎉 Welcome! Setting up your first culinary experience...');
      const success = await createSamplePosts(userId);
      return success;
    }

    return false; // No new content created
  } catch (error) {
    console.error('Error in checkAndCreateSampleContent:', error);
    return false;
  }
};

export const createSampleUserCuisineProgress = async (userId: string): Promise<boolean> => {
  try {
    // Get some cuisines
    const { data: cuisines, error: cuisineError } = await supabase
      .from('cuisines')
      .select('id, name')
      .limit(5);

    if (cuisineError || !cuisines || cuisines.length === 0) {
      console.warn('No cuisines available for progress tracking');
      return false;
    }

    // Create sample progress for a few cuisines
    const progressData = cuisines.slice(0, 3).map((cuisine, index) => ({
      user_id: userId,
      cuisine_id: cuisine.id,
      first_tried_at: new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(), // Past weeks
      times_tried: index + 2, // 2, 3, 4 times
      favorite_restaurant: index === 0 ? "Mama's Kitchen" : index === 1 ? "Tokyo Nights" : "Spice Garden"
    }));

    const { error: progressError } = await supabase
      .from('user_cuisine_progress')
      .insert(progressData);

    if (progressError) {
      console.error('Error creating sample progress:', progressError);
      return false;
    }

    console.log('✅ Created sample cuisine progress');
    return true;

  } catch (error) {
    console.error('Failed to create sample cuisine progress:', error);
    return false;
  }
};