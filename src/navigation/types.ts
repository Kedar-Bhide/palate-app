import { BottomTabScreenProps, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

export type TabParamList = {
  Home: undefined;
  MyPosts: undefined;
  Camera: undefined;
  Discover: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  CreatePost: { photos?: string[]; draftData?: any };
  PostDetail: { postId: string; fromScreen?: string };
  UserProfile: { userId: string };
  PhotoSelection: { photos: string[] };
};

export interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export interface CustomTabBarProps extends BottomTabBarProps {
  // Additional custom props can be added here
}

export interface TabConfig {
  name: keyof TabParamList;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  accessibilityLabel: string;
  badgeKey?: string;
}

// Stack Navigator Props
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Tab Screen Props
export type HomeScreenProps = BottomTabScreenProps<TabParamList, 'Home'>;
export type MyPostsScreenProps = BottomTabScreenProps<TabParamList, 'MyPosts'>;
export type CameraScreenProps = BottomTabScreenProps<TabParamList, 'Camera'>;
export type DiscoverScreenProps = BottomTabScreenProps<TabParamList, 'Discover'>;
export type ProfileScreenProps = BottomTabScreenProps<TabParamList, 'Profile'>;

// Stack Screen Props
export type CreatePostScreenProps = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;
export type PostDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;
export type UserProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;
export type PhotoSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'PhotoSelection'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends TabParamList {}
  }
}