import { ObjectId } from 'mongodb';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image';       // defaults to 'text'
  image_url?: string;             // base64 data URI for generated images
  timestamp: Date;
}

export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  hashed_password?: string;
  reset_token?: string | null;
  reset_token_expire?: Date | null;
}

export interface Chat {
  _id?: ObjectId;
  user_id: ObjectId;
  title: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}
