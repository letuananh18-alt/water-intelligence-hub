// ==========================================================================
// HIGH-TECH FUTURISTIC DIGITAL WATER ANIMATION CANVAS (DIGITAL TRANSFORMATION)
// Performance Optimized: Automatically pauses when Auth Screen is hidden
// ==========================================================================

class TechBackground {
  constructor() {
    this.canvas = document.getElementById('techBgCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.nodes = [];
    this.waveOffset = 0;
    this.isAnimating = false;
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.createNodes();
    this.start();
  }

  start() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  stop() {
    this.isAnimating = false;
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createNodes() {
    const count = Math.floor((window.innerWidth * window.innerHeight) / 22000);
    this.nodes = [];
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        x: Math.random() * (this.canvas.width || window.innerWidth),
        y: Math.random() * (this.canvas.height || window.innerHeight),
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  animate() {
    const authContainer = document.getElementById('authContainer');
    if (authContainer && authContainer.style.display === 'none') {
      this.isAnimating = false;
      return;
    }

    if (!this.canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Deep digital transformation gradient background
    const bgGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    bgGradient.addColorStop(0, '#060D1E');
    bgGradient.addColorStop(0.5, '#0B1936');
    bgGradient.addColorStop(1, '#030814');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Cybernetic Grid Lines
    this.ctx.strokeStyle = 'rgba(0, 102, 255, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Draw Digital Water Sine Waves
    this.waveOffset += 0.015;
    for (let w = 0; w < 3; w++) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = w === 0 ? 'rgba(0, 212, 255, 0.15)' : (w === 1 ? 'rgba(0, 102, 255, 0.12)' : 'rgba(59, 130, 246, 0.08)');
      this.ctx.lineWidth = 2 - w * 0.4;
      const amplitude = 30 + w * 15;
      const frequency = 0.005 - w * 0.001;

      for (let x = 0; x < this.canvas.width; x += 8) {
        const y = this.canvas.height * (0.65 + w * 0.1) + Math.sin(x * frequency + this.waveOffset + w) * amplitude;
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }

    // Update and Draw IoT Water Nodes & Connection Network
    for (let i = 0; i < this.nodes.length; i++) {
      const nodeA = this.nodes[i];
      nodeA.x += nodeA.vx;
      nodeA.y += nodeA.vy;
      nodeA.pulse += 0.03;

      if (nodeA.x < 0 || nodeA.x > this.canvas.width) nodeA.vx *= -1;
      if (nodeA.y < 0 || nodeA.y > this.canvas.height) nodeA.vy *= -1;

      // Connect nearby nodes with digital tech lines
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeB = this.nodes[j];
        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.2;
          this.ctx.strokeStyle = `rgba(0, 180, 255, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(nodeA.x, nodeA.y);
          this.ctx.lineTo(nodeB.x, nodeB.y);
          this.ctx.stroke();
        }
      }

      // Draw Glowing Water Node Dot
      const glowingRadius = nodeA.radius + Math.sin(nodeA.pulse) * 0.8;
      this.ctx.fillStyle = '#00E5FF';
      this.ctx.beginPath();
      this.ctx.arc(nodeA.x, nodeA.y, Math.max(1, glowingRadius), 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (this.isAnimating) {
      requestAnimationFrame(() => this.animate());
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.techBgInstance = new TechBackground();
});
