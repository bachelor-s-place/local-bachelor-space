export interface Message {
  id: string;
  squad_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  content_type: string;
  sent_at: string;
  read_by: string[];
}

export interface GetMessagesResponse {
  messages: Message[];
  count: number;
  next_cursor?: string;
}

export interface SendMessageResponse {
  message: Message;
}
