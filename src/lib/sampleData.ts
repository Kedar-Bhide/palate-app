/**
 * Sample Data Generation
 * Creates sample posts and data for first-time user experience
 */

import { supabase } from './supabase';

export const createSamplePosts = async (userId: string): Promise<boolean> => {
  try {
    console.log('🍽️ Creating sample posts for first-time experience...');

    // Sample posts data using current schema
    const samplePosts = [
      {
        user_id: userId,
        restaurant_name: "Mama's Kitchen",
        cuisine: 'Italian',
        rating: 5,
        review: "Amazing homemade pasta! The carbonara was creamy perfection. This cozy little place feels like eating at your Italian grandmother's house.",
        dining_type: 'casual',
        photo_urls: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400'],
        is_private: false,
        created_at: new Date().toISOString(),
      },
      {
        user_id: userId,
        restaurant_name: "Tokyo Nights",
        cuisine: 'Japanese',
        rating: 4,
        review: "Fresh sushi and great atmosphere. The salmon nigiri melted in my mouth. Definitely coming back to try more items from their extensive menu.",
        dining_type: 'fine_dining',
        photo_urls: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400'],
        is_private: false,
        created_at: new Date().toISOString(),
      },
      {
        user_id: userId,
        restaurant_name: "Spice Garden",
        cuisine: 'Indian',
        rating: 5,
        review: "Incredible flavors! The butter chicken was rich and creamy, and the naan bread was perfectly fluffy. Great vegetarian options too.",
        dining_type: 'casual',
        photo_urls: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400'],
        is_private: false,
        created_at: new Date().toISOString(),
      },
      {
        user_id: userId,
        restaurant_name: "Le Petit Bistro",
        cuisine: 'French',
        rating: 4,
        review: "Authentic French cuisine with a modern twist. The coq au vin was tender and flavorful. A bit pricey but worth it for special occasions.",
        dining_type: 'fine_dining',
        photo_urls: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'],
        is_private: false,
        created_at: new Date().toISOString(),
      },
      {
        user_id: userId,
        restaurant_name: "Street Tacos Maya",
        cuisine: 'Mexican',
        rating: 5,
        review: "Best tacos in the city! Al pastor was perfectly seasoned and the homemade tortillas were incredible. Great prices and generous portions.",
        dining_type: 'street_food',
        photo_urls: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'],
        is_private: false,
        created_at: new Date().toISOString(),
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
    
    // Also create some sample likes and interactions
    if (insertedPosts && insertedPosts.length > 0) {
      // Add some likes to make the feed more realistic
      const likesToAdd = [
        { user_id: userId, post_id: insertedPosts[0].id },
        { user_id: userId, post_id: insertedPosts[2].id },
        { user_id: userId, post_id: insertedPosts[4].id },
      ];
      
      await supabase.from('post_likes').insert(likesToAdd).select();
    }
    
    // Trigger a slight delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;

  } catch (error) {
    console.error('Failed to create sample posts:', error);
    return false;
  }
};

export const createTestPost = async (userId: string): Promise<boolean> => {
  try {
    console.log('🍽️ Creating test post...');

    const testPost = {
      user_id: userId,
      restaurant_name: "Test Restaurant",
      cuisine: 'American',
      rating: 4,
      review: "This is a test post to verify the posting system works correctly!",
      dining_type: 'casual',
      photo_urls: ['https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400'],
      is_private: false,
      created_at: new Date().toISOString(),
    };

    const { data: insertedPost, error: postError } = await supabase
      .from('posts')
      .insert(testPost)
      .select()
      .single();

    if (postError) {
      console.error('Error creating test post:', postError);
      return false;
    }

    console.log('✅ Test post created successfully:', insertedPost.id);
    return true;
  } catch (error) {
    console.error('Error creating test post:', error);
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