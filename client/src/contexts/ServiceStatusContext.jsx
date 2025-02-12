import React, { createContext, useContext, useState, useEffect } from "react";

const ServiceStatusContext = createContext();

export function ServiceStatusProvider({ children }) {
  const [services, setServices] = useState({
    mistral: { status: "loading", latency: null },
    flux: { status: "loading", latency: null },
  });

  const areServicesHealthy = () => {
    return Object.values(services).every(
      (service) => service.status === "healthy"
    );
  };

  const fetchServiceHealth = async (service) => {
    console.log(`Checking health for ${service} service...`);
    try {
      const response = await fetch(`/api/health/${service}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      console.log(`Response status for ${service}:`, response.status);

      const data = await response.json();
      console.log(`Health data for ${service}:`, data);

      if (response.ok) {
        setServices((prev) => ({
          ...prev,
          [service]: {
            status: data.status,
            latency: data.latency,
            error: data.error,
          },
        }));
      } else {
        const errorData = data?.detail || data;
        console.error(`Error checking ${service} health:`, errorData);
        setServices((prev) => ({
          ...prev,
          [service]: {
            status: "unhealthy",
            latency: null,
            error: errorData?.error || "Service unavailable",
          },
        }));
      }
    } catch (error) {
      console.error(`Failed to check ${service} health:`, error);
      setServices((prev) => ({
        ...prev,
        [service]: {
          status: "unhealthy",
          latency: null,
          error: "Connection error",
        },
      }));
    }
  };

  useEffect(() => {
    console.log("ServiceStatusProvider mounted, initializing health checks...");
    const checkHealth = () => {
      console.log("Running health checks...");
      fetchServiceHealth("mistral");
      fetchServiceHealth("flux");
    };

    // Premier check immédiat
    checkHealth();

    // Mettre en place l'intervalle
    console.log("Setting up health check interval...");
    const interval = setInterval(checkHealth, 30000);

    // Cleanup
    return () => {
      console.log("Cleaning up health check interval...");
      clearInterval(interval);
    };
  }, []);

  return (
    <ServiceStatusContext.Provider value={{ services, areServicesHealthy }}>
      {children}
    </ServiceStatusContext.Provider>
  );
}

export function useServiceStatus() {
  const context = useContext(ServiceStatusContext);
  if (!context) {
    throw new Error(
      "useServiceStatus must be used within a ServiceStatusProvider"
    );
  }
  return context;
}
