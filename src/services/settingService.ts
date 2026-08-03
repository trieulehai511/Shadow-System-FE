import { apiRequest } from './api';
import {
  UserLanguage,
  UserSetting,
  UserSettingApiResponse,
} from '../models/UserSettingModel';

export type AppLanguage = 'vi' | 'en' | 'ja' | 'ko';

export interface UpdateUserSettingRequest{
    region: UserSetting['region'];
    language: UserSetting['language'];
    theme: UserSetting['theme'];
    zoneId: string;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
}


export const toAppLanguage = (
  language: UserLanguage
): AppLanguage => {
  return language.toLowerCase() as AppLanguage;
};

export const getMySettings = async (): Promise<UserSetting> => {
  const response = await apiRequest<UserSettingApiResponse>('/settings');
  return response.result;
};

export const updateMySettings = async (
  settings: UpdateUserSettingRequest
): Promise<UserSetting> => {
  const response = await apiRequest<UserSettingApiResponse>(
    '/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    }
  );

  return response.result;
};
