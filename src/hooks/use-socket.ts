'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export const useSocket = (namespace: string = '/public') => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const nextSocket = io(`${socketUrl}${namespace}`, {
      withCredentials: true,
    });
    let active = true;

    queueMicrotask(() => {
      if (active) setSocket(nextSocket);
    });

    return () => {
      active = false;
      nextSocket.disconnect();
    };
  }, [namespace]);

  return socket;
};
