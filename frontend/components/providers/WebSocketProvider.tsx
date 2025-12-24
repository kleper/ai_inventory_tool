"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

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
    const { data: session } = useSession();
    // Version Log to verify cache clearing
    useEffect(() => { console.log("WebSocketProvider Loaded: Version Fix_1.2 (No notifications path)"); }, []);

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    const connect = () => {
        if (ws.current?.readyState === WebSocket.OPEN) return;
        const user = session?.user as any;
        if (!user?.id) return; // Wait for auth

        // Determine WS URL (assuming localhost for dev)
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host;

        // Correct URL matching backend: /api/v1/inventory/ws/{user_id}
        const wsUrl = `ws://${host}/api/v1/inventory/ws/${user.id}`;

        console.log(`Msg: Connecting WS to ${wsUrl}`);
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
        const user = session?.user as any;
        if (user?.id) {
            connect();
        }
        return () => {
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            ws.current?.close();
        };
    }, [session]);

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
