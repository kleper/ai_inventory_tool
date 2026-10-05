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

    const userId = (session?.user as any)?.id;
    const isUnmounting = useRef(false);

    const connect = () => {
        if (!userId) return; // Wait for auth
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // Determine WS URL (use current window host which is the Next.js proxy)
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;

        // Connect via the Proxy path: /api/proxy/api/v1/inventory/ws/{user_id}
        const wsUrl = `${protocol}//${host}/api/proxy/api/v1/inventory/ws/${userId}`;

        console.log(`Msg: Connecting WS to ${wsUrl}`);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
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
            if (!isUnmounting.current && userId) {
                if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = setTimeout(connect, 3000);
            }
        };

        ws.current = socket;
    };

    useEffect(() => {
        isUnmounting.current = false;
        if (userId) {
            connect();
        }
        return () => {
            isUnmounting.current = true;
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [userId]);

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
