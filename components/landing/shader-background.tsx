"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  
  vec2 effect(vec2 p, float time) {
    return vec2(sin(length(p.x - time)), cos(p.y * 3.14 + length(p.x - time)));
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;
    
    // Apply the effect
    vec2 e = effect(p, u_time * 0.5);
    
    // Create color based on the effect - Purple/Cyan/Green theme
    vec3 color1 = vec3(0.545, 0.361, 0.965); // Purple #8b5cf6
    vec3 color2 = vec3(0.082, 0.714, 0.831); // Cyan #15b6d4
    vec3 color3 = vec3(0.063, 0.725, 0.506); // Emerald #10b981
    vec3 color4 = vec3(0.388, 0.400, 0.945); // Indigo #6366f1
    
    // Mix colors based on position and effect
    float mixFactor1 = sin(e.x * 2.0 + u_time * 0.3) * 0.5 + 0.5;
    float mixFactor2 = cos(e.y * 2.0 + u_time * 0.4) * 0.5 + 0.5;
    
    vec3 finalColor = mix(
      mix(color1, color2, mixFactor1),
      mix(color3, color4, mixFactor2),
      sin(length(p) + u_time * 0.2) * 0.5 + 0.5
    );
    
    // Add some wave distortion
    float wave = sin(p.x * 5.0 + u_time) * cos(p.y * 3.0 + u_time * 0.7) * 0.1;
    finalColor += wave;
    
    // Darker vignette for better readability
    float vignette = 1.0 - length(p) * 0.4;
    finalColor *= vignette * 0.6; // Dimmed for text readability
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");

    // Create buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]),
      gl.STATIC_DRAW
    );

    // Resize handler
    function resizeCanvas() {
      if (!canvas) return;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }

    // Render loop
    const startTime = Date.now();
    
    function render() {
      if (!gl || !canvas) return;
      
      resizeCanvas();
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000);

      // Set up attribute
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    }

    render();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ mixBlendMode: "normal" }}
    />
  );
}

