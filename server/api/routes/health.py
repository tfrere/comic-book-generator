import time
import asyncio
from fastapi import APIRouter, HTTPException
from langchain.schema import SystemMessage
from api.models import HealthCheckResponse
from services.mistral_client import MistralClient
from services.flux_client import FluxClient

def get_health_router(mistral_client: MistralClient, flux_client: FluxClient) -> APIRouter:
    router = APIRouter()

    @router.get("/health/mistral", response_model=HealthCheckResponse)
    async def check_mistral_health():
        """Vérifie la disponibilité du service Mistral."""
        print("Checking Mistral health...")
        start_time = time.time()
        try:
            # Try to make a simple request to Mistral with a 5 second timeout
            await asyncio.wait_for(
                mistral_client.check_health(),
                timeout=5.0
            )
            
            latency = (time.time() - start_time) * 1000  # Convert to milliseconds
            print(f"Mistral health check successful. Latency: {latency}ms")
            return HealthCheckResponse(
                status="healthy",
                service="mistral",
                latency=latency
            )
        except asyncio.TimeoutError:
            print("Mistral health check failed: timeout")
            raise HTTPException(
                status_code=503,
                detail=HealthCheckResponse(
                    status="unhealthy",
                    service="mistral",
                    latency=None,
                    error="Request timed out after 5 seconds"
                ).dict()
            )
        except Exception as e:
            print(f"Mistral health check failed: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail=HealthCheckResponse(
                    status="unhealthy",
                    service="mistral",
                    latency=None,
                    error=str(e)
                ).dict()
            )

    @router.get("/health/flux", response_model=HealthCheckResponse)
    async def check_flux_health():
        """Vérifie la disponibilité du service Flux."""
        print("Checking Flux health...")
        start_time = time.time()
        try:
            # Try to generate a test image with a timeout
            is_healthy, status = await asyncio.wait_for(
                flux_client.check_health(),
                timeout=5.0  # Même timeout que Mistral
            )
            
            latency = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            if is_healthy:
                print(f"Flux health check successful. Latency: {latency}ms")
                return HealthCheckResponse(
                    status="healthy",
                    service="flux",
                    latency=latency
                )
            elif status == "initializing":
                print("Flux service is initializing")
                raise HTTPException(
                    status_code=503,
                    detail=HealthCheckResponse(
                        status="initializing",
                        service="flux",
                        latency=None,
                        error="Service is initializing"
                    ).dict()
                )
            else:
                print(f"Flux health check failed: {status}")
                raise HTTPException(
                    status_code=503,
                    detail=HealthCheckResponse(
                        status="unhealthy",
                        service="flux",
                        latency=None,
                        error=status
                    ).dict()
                )
                
        except asyncio.TimeoutError:
            print("Flux health check failed: timeout")
            raise HTTPException(
                status_code=503,
                detail=HealthCheckResponse(
                    status="unhealthy",
                    service="flux",
                    latency=None,
                    error="Image generation timed out after 5 seconds"
                ).dict()
            )
        except Exception as e:
            print(f"Flux health check failed: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail=HealthCheckResponse(
                    status="unhealthy",
                    service="flux",
                    latency=None,
                    error=str(e)
                ).dict()
            )

    return router 