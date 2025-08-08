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

// Tab Screen Props
export type HomeScreenProps = BottomTabScreenProps<TabParamList, 'Home'>;
export type MyPostsScreenProps = BottomTabScreenProps<TabParamList, 'MyPosts'>;
export type CameraScreenProps = BottomTabScreenProps<TabParamList, 'Camera'>;
export type DiscoverScreenProps = BottomTabScreenProps<TabParamList, 'Discover'>;
export type ProfileScreenProps = BottomTabScreenProps<TabParamList, 'Profile'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends TabParamList {}
  }
}