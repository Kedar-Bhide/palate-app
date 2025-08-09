/**
 * Mock Friend Data for Onboarding
 * Sample friend suggestions for friend discovery during onboarding
 */

export interface MockFriend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  initials: string;
  mutualFriends?: number;
  isAdded?: boolean;
}

export const mockFriends: MockFriend[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    username: 'chef_sarah',
    initials: 'SC',
    mutualFriends: 3,
    isAdded: false,
  },
  {
    id: '2',
    name: 'Mike Rodriguez',
    username: 'pizza_pete',
    initials: 'MR',
    mutualFriends: 1,
    isAdded: false,
  },
  {
    id: '3',
    name: 'Emma Wilson',
    username: 'foodlover',
    initials: 'EW',
    mutualFriends: 5,
    isAdded: false,
  },
  {
    id: '4',
    name: 'James Park',
    username: 'spice_master',
    initials: 'JP',
    mutualFriends: 2,
    isAdded: false,
  },
];

// Helper function to get friend suggestions
export const getFriendSuggestions = (): MockFriend[] => {
  return mockFriends.map(friend => ({ ...friend }));
};

// Helper function to search friends
export const searchFriends = (query: string): MockFriend[] => {
  if (!query.trim()) {
    return getFriendSuggestions();
  }

  const lowercaseQuery = query.toLowerCase();
  return mockFriends.filter(
    friend =>
      friend.name.toLowerCase().includes(lowercaseQuery) ||
      friend.username.toLowerCase().includes(lowercaseQuery)
  );
};