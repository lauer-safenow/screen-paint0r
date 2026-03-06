export class CanvasManager {
  readonly persistentCanvas: HTMLCanvasElement;
  readonly activeCanvas: HTMLCanvasElement;
  readonly persistentCtx: CanvasRenderingContext2D;
  readonly activeCtx: CanvasRenderingContext2D;

  constructor(container: HTMLElement) {
    this.persistentCanvas = document.createElement('canvas');
    this.activeCanvas = document.createElement('canvas');

    this.persistentCanvas.className = 'canvas-layer';
    this.activeCanvas.className = 'canvas-layer';

    container.appendChild(this.persistentCanvas);
    container.appendChild(this.activeCanvas);

    this.persistentCtx = this.persistentCanvas.getContext('2d')!;
    this.activeCtx = this.activeCanvas.getContext('2d')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const canvas of [this.persistentCanvas, this.activeCanvas]) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
    }
  }

  setInteractive(active: boolean) {
    if (active) {
      this.activeCanvas.classList.add('active');
    } else {
      this.activeCanvas.classList.remove('active');
    }
  }

  clearActive() {
    this.clearCanvas(this.activeCtx, this.activeCanvas);
  }

  clearPersistent() {
    this.clearCanvas(this.persistentCtx, this.persistentCanvas);
  }

  private clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
