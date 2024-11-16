import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationSettings } from './NotificationSettings';

export function NotificationSettingsWrapper() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return <NotificationSettings userId={user.id} />;
}
