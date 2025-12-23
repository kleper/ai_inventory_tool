"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";

interface WebSocketContextType {
    isConnected: boolean;
    lastMessage: any;
    sendMessage: (msg: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
    isConnected: false,
    lastMessage: null,
    sendMessage: () => { },
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    // Mock user_id for now, in real app this comes from auth
    const userId = 1;

    const connect = () => {
        if (ws.current?.readyState === WebSocket.OPEN) return;

        // Determine WS URL (assuming localhost for dev)
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host;
        // Note: On Docker, port might be different or proxied. Assuming backend exposed on 8000.
        // In dev, Next.js proxy might be needed or direct connection.
        // For now, let's try direct to backend:8000 if localhost, else relative if proxied.
        const wsUrl = `ws://localhost:8000/api/v1/inventory/ws/notifications/${userId}`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("WS Message:", data);
                setLastMessage(data);
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };

        socket.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
            // Reconnect logic
            reconnectTimeout.current = setTimeout(connect, 3000);
        };

        ws.current = socket;
    };

    useEffect(() => {
        connect();
        return () => {
            ws.current?.close();
        };
    }, []);

    const sendMessage = (msg: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};
