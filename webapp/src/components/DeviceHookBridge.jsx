"use client";

import { useEffect, useRef } from "react";

export default function DeviceHookBridge() {
  const backendWsRef = useRef(null);
  const deviceHookWsRef = useRef(null);
  const isDeviceHookConnectedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let backendReconnectTimer = null;
    let deviceHookReconnectTimer = null;

    const BACKEND_WS_URL =
      process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:5001";
    const DEVICE_HOOK_WS_URL =
      process.env.NEXT_PUBLIC_DEVICE_HOOK_WS_URL || "ws://localhost:9000/";

    function notifyBackendDeviceHookStatus(connected) {
      isDeviceHookConnectedRef.current = connected;
      if (
        backendWsRef.current &&
        backendWsRef.current.readyState === WebSocket.OPEN
      ) {
        try {
          backendWsRef.current.send(
            JSON.stringify({
              type: "device-hook-status",
              connected: connected,
            })
          );
        } catch (_err) {
          // ignore transient send error
        }
      }
    }

    function connectBackend() {
      if (!isMounted) return;
      if (
        backendWsRef.current &&
        (backendWsRef.current.readyState === WebSocket.OPEN ||
          backendWsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      try {
        const ws = new WebSocket(BACKEND_WS_URL);
        backendWsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(
            "[DeviceHookBridge] Connected to Backend WS relay at",
            BACKEND_WS_URL
          );
          notifyBackendDeviceHookStatus(isDeviceHookConnectedRef.current);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            console.log(
              "[DeviceHookBridge] Received command from Backend:",
              data
            );

            if (data?.id && data?.action) {
              const dhWs = deviceHookWsRef.current;
              if (dhWs && dhWs.readyState === WebSocket.OPEN) {
                dhWs.send(JSON.stringify(data));
              } else {
                console.warn(
                  "[DeviceHookBridge] device-hook is not connected. Sending error response back to backend."
                );
                ws.send(
                  JSON.stringify({
                    id: data.id,
                    status: "error",
                    message:
                      "device-hook C# helper application is not connected to frontend.",
                  })
                );
              }
            }
          } catch (err) {
            console.error(
              "[DeviceHookBridge] Error processing message from backend:",
              err
            );
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          console.warn(
            "[DeviceHookBridge] Backend WS disconnected. Retrying in 3s..."
          );
          backendWsRef.current = null;
          backendReconnectTimer = setTimeout(connectBackend, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          console.warn(
            `[DeviceHookBridge] Backend WS connection failed (${BACKEND_WS_URL}). Ensure NestJS backend is running.`
          );
        };
      } catch (err) {
        if (!isMounted) return;
        console.error("[DeviceHookBridge] Error creating Backend WS:", err);
        backendReconnectTimer = setTimeout(connectBackend, 3000);
      }
    }

    function connectDeviceHook() {
      if (!isMounted) return;
      if (
        deviceHookWsRef.current &&
        (deviceHookWsRef.current.readyState === WebSocket.OPEN ||
          deviceHookWsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      try {
        const ws = new WebSocket(DEVICE_HOOK_WS_URL);
        deviceHookWsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(
            "[DeviceHookBridge] Connected to device-hook C# app at",
            DEVICE_HOOK_WS_URL
          );
          notifyBackendDeviceHookStatus(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            console.log(
              "[DeviceHookBridge] Received response from device-hook:",
              event.data
            );
            const backendWs = backendWsRef.current;
            if (backendWs && backendWs.readyState === WebSocket.OPEN) {
              backendWs.send(event.data);
            }
          } catch (err) {
            console.error(
              "[DeviceHookBridge] Error relaying response to backend:",
              err
            );
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          console.warn(
            "[DeviceHookBridge] device-hook WS disconnected. Retrying in 3s..."
          );
          deviceHookWsRef.current = null;
          notifyBackendDeviceHookStatus(false);
          deviceHookReconnectTimer = setTimeout(connectDeviceHook, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          console.warn(
            `[DeviceHookBridge] device-hook WS connection failed (${DEVICE_HOOK_WS_URL}). Ensure foundersharness Dev Helper app is running.`
          );
        };
      } catch (err) {
        if (!isMounted) return;
        console.error("[DeviceHookBridge] Error creating device-hook WS:", err);
        notifyBackendDeviceHookStatus(false);
        deviceHookReconnectTimer = setTimeout(connectDeviceHook, 3000);
      }
    }

    connectBackend();
    connectDeviceHook();

    return () => {
      isMounted = false;
      if (backendReconnectTimer) clearTimeout(backendReconnectTimer);
      if (deviceHookReconnectTimer) clearTimeout(deviceHookReconnectTimer);

      if (backendWsRef.current) {
        const ws = backendWsRef.current;
        backendWsRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      }
      if (deviceHookWsRef.current) {
        const ws = deviceHookWsRef.current;
        deviceHookWsRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      }
    };
  }, []);

  return null;
}
