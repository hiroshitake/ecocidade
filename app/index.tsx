import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to login on app start
  // In a real app, you'd check auth state here
  return <Redirect href="/login" />;
}

