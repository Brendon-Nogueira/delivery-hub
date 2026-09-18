import { UserRole } from '../enums/user-role.enum';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface AuthResponseDTO {
  accessToken: string;
  user: UserDTO;
}
