export const updateUser = async (token: string, userId: string, update: Partial<User>): Promise<User> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(update)
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || 'Failed to update user');
};
import { BACKEND_API_URL } from './config';

export interface User {
  _id: string;
  username: string;
  name: string;
  dob: string;
  contactNo: string;
  email: string;
  role: string;
  privilegeForBooks?: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    preferences?: {
      defaultLanguage?: string;
      theme?: string;
    };
  };
}

export const fetchAllUsers = async (token: string): Promise<User[]> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/users`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || 'Failed to fetch users');
};
