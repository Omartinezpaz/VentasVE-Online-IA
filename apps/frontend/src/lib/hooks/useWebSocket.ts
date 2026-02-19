'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '../socket/client';

type EventHandler<T> = (data: T) => void;

export const useWebSocket = <T>(event: string, handler: EventHandler<T>) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const socket = getSocket();

    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, wrappedHandler);

    return () => {
      socket.off(event, wrappedHandler);
    };
  }, [event]);
};
