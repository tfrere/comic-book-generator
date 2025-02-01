import React, { useRef, useEffect, useState, useCallback } from "react";
import { Box } from "@mui/material";

export function MicroIntensity({ numBars = 8 }) {
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [intensities, setIntensities] = useState(new Array(numBars).fill(0));
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const initAudio = async () => {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const source = context.createMediaStreamSource(stream);
        source.connect(analyserNode);

        setAudioContext(context);
        setAnalyser(analyserNode);
      } catch (error) {
        console.error("Error accessing the microphone:", error);
      }
    };

    initAudio();

    return () => {
      if (audioContext) {
        audioContext.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const drawCanvas = useCallback((intensities) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw red circle
    ctx.beginPath();
    ctx.arc(5, height / 2, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();

    // Draw intensity bars
    const barWidth = 3;
    const barSpacing = 1;
    const startX = 15; // Start after the red circle
    const minBarHeight = 2;
    const maxBarHeight = height - 5; // Max height minus some padding

    intensities.forEach((intensity, index) => {
      const barHeight = Math.max(minBarHeight, intensity * maxBarHeight);
      const x = startX + index * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = "white";
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, []);

  useEffect(() => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateIntensities = () => {
      analyser.getByteFrequencyData(dataArray);

      let newIntensities = Array.from({ length: numBars }, (_, i) => {
        const start = Math.floor((i / numBars) * bufferLength);
        const end = Math.floor(((i + 1) / numBars) * bufferLength);
        const average =
          dataArray.slice(start, end).reduce((sum, value) => sum + value, 0) /
          (end - start);
        return average / 255;
      });

      // Sort intensities from highest to lowest
      newIntensities.sort((a, b) => b - a);

      // Reorder intensities to put highest in the middle and alternate others
      const reorderedIntensities = new Array(numBars);
      let left = Math.floor(numBars / 2) - 1;
      let right = Math.floor(numBars / 2);
      newIntensities.forEach((intensity, index) => {
        if (index % 2 === 0) {
          reorderedIntensities[right] = intensity;
          right++;
        } else {
          reorderedIntensities[left] = intensity;
          left--;
        }
      });

      setIntensities(reorderedIntensities);
      drawCanvas(reorderedIntensities);
      animationRef.current = requestAnimationFrame(updateIntensities);
    };

    updateIntensities();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, numBars, drawCanvas]);

  return (
    <Box sx={{ width: 50, height: 40, display: "flex", alignItems: "center" }}>
      <canvas ref={canvasRef} width={50} height={40} />
    </Box>
  );
}
