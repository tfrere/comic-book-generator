import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { styled } from "@mui/system";
import { useServiceStatus } from "../contexts/ServiceStatusContext";

const StatusDot = styled("div")(({ status }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor:
    status === "healthy"
      ? "#4caf50"
      : status === "initializing"
      ? "#FFA726"
      : status === "unhealthy"
      ? "#f44336"
      : "#9e9e9e",
  marginRight: 8,
}));

const ServiceLabel = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginRight: 16,
  "& .MuiTypography-root": {
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.7)",
  },
});

const ServiceStatusContainer = styled("div")({
  position: "absolute",
  top: 16,
  left: 16,
  padding: 8,
  borderRadius: 4,
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  zIndex: 1000,
});

export function ServiceStatus() {
  const { services } = useServiceStatus();

  const fetchServiceHealth = async (service) => {
    try {
      const response = await fetch(`/api/health/${service}`);
      const data = await response.json();

      if (response.ok) {
        return {
          status: data.status,
          latency: data.latency,
          error: null,
        };
      } else {
        return {
          status: data.status || "unhealthy",
          latency: null,
          error: data.error || "Service unavailable",
        };
      }
    } catch (error) {
      console.error(`Error checking ${service} health:`, error);
      return {
        status: "unhealthy",
        latency: null,
        error: error.message,
      };
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      const mistralHealth = await fetchServiceHealth("mistral");
      const fluxHealth = await fetchServiceHealth("flux");

      // Assuming you want to update the state with the fetched health data
      // This is a placeholder and should be replaced with actual state management logic
      console.log("Updating health status:", {
        mistral: mistralHealth,
        flux: fluxHealth,
      });
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ServiceStatusContainer>
      {Object.entries(services).map(([service, { status, latency, error }]) => (
        <ServiceLabel key={service}>
          <StatusDot status={status} />
          <Typography>
            {service.charAt(0).toUpperCase() + service.slice(1)}
            {/* {status === "healthy" && latency && ` (${Math.round(latency)}ms)`} */}
            {/* {status === "initializing" && " (initializing...)"}
            {status === "unhealthy" && error && ` (${error})`} */}
          </Typography>
        </ServiceLabel>
      ))}
    </ServiceStatusContainer>
  );
}
