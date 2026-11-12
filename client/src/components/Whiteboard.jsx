import React, { useRef, useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Pen,
  Square,
  Circle,
  Minus,
  Eraser,
  Trash2,
  Download,
  Palette,
} from 'lucide-react';

export default function Whiteboard({ sessionId }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const { socket } = useSocket();

  const [tool, setTool] = useState('pen'); // 'pen' | 'line' | 'rect' | 'circle' | 'eraser'
  const [color, setColor] = useState('#60a5fa'); // blue-400
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const snapshotRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high-DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    // Draw background grid
    drawGrid(ctx, rect.width, rect.height);
  }, []);

  const drawGrid = (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 24;

    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  // WebSockets Remote Drawing Listener
  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleRemoteDraw = (action) => {
      const ctx = contextRef.current;
      if (!ctx) return;

      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (action.tool === 'pen' || action.tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(action.fromX, action.fromY);
        ctx.lineTo(action.toX, action.toY);
        ctx.stroke();
      } else if (action.tool === 'rect') {
        ctx.strokeRect(action.fromX, action.fromY, action.toX - action.fromX, action.toY - action.fromY);
      } else if (action.tool === 'circle') {
        const radius = Math.sqrt(Math.pow(action.toX - action.fromX, 2) + Math.pow(action.toY - action.fromY, 2));
        ctx.beginPath();
        ctx.arc(action.fromX, action.fromY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(action.fromX, action.fromY);
        ctx.lineTo(action.toX, action.toY);
        ctx.stroke();
      }
      ctx.restore();
    };

    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      drawGrid(ctx, rect.width, rect.height);
    };

    socket.on('whiteboard-remote-draw', handleRemoteDraw);
    socket.on('whiteboard-remote-clear', handleRemoteClear);

    return () => {
      socket.off('whiteboard-remote-draw', handleRemoteDraw);
      socket.off('whiteboard-remote-clear', handleRemoteClear);
    };
  }, [socket, sessionId]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const coords = getCanvasCoords(e);
    setStartPos(coords);
    setIsDrawing(true);

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    // Save snapshot for shapes preview
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    const strokeColor = tool === 'eraser' ? '#0f172a' : color;
    const width = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = width;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      // Emit to peers
      socket?.emit('whiteboard-draw', {
        sessionId,
        drawAction: {
          tool,
          fromX: startPos.x,
          fromY: startPos.y,
          toX: coords.x,
          toY: coords.y,
          color: strokeColor,
          strokeWidth: width,
        },
      });

      setStartPos(coords);
    } else {
      // Shape preview: restore snapshot first
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = width;

      if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool !== 'pen' && tool !== 'eraser') {
      const coords = getCanvasCoords(e);
      const strokeColor = color;

      socket?.emit('whiteboard-draw', {
        sessionId,
        drawAction: {
          tool,
          fromX: startPos.x,
          fromY: startPos.y,
          toX: coords.x,
          toY: coords.y,
          color: strokeColor,
          strokeWidth,
        },
      });
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear whiteboard for all participants?')) {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      drawGrid(ctx, rect.width, rect.height);
      socket?.emit('whiteboard-clear', { sessionId });
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `whiteboard-${sessionId || 'diagram'}.png`;
    a.href = url;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 select-none">
      {/* Whiteboard Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Pen"
          >
            <Pen className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'rect' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'eraser' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Color Palettes */}
          {['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#c084fc', '#f8fafc'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition-transform ${
                color === c ? 'scale-110 border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Stroke Width */}
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-xs"
          >
            <option value={2}>2px</option>
            <option value={4}>4px</option>
            <option value={6}>6px</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Export PNG"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Clear Board"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
