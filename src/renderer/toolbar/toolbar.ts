import { ToolType, DrawingStyle } from '../../shared/types';

export interface ToolbarState {
  activeTool: ToolType;
  style: DrawingStyle;
}

type ToolbarChangeCallback = (state: ToolbarState) => void;
type ActionCallback = () => void;

const COLORS = ['#ffffff', '#000000', '#3b82f6', '#eab308', '#ef4444'];
const WIDTHS = [2, 4, 8];

const TOOL_ICONS: Record<ToolType, string> = {
  freehand: '\u270F',
  rectangle: '\u25AD',
  circle: '\u25EF',
  arrow: '\u279C',
  eraser: '\u232B',
};

export class Toolbar {
  private el: HTMLDivElement;
  private state: ToolbarState = {
    activeTool: 'freehand',
    style: { color: '#ffffff', width: 4 },
  };
  private onChange: ToolbarChangeCallback;
  private onClear: ActionCallback;
  private onDone: ActionCallback;
  private onUndo: ActionCallback;
  private onRedo: ActionCallback;
  private onPointer: ActionCallback;
  private onSwitchToDraw: ActionCallback;
  private onColorPickerOpened: ActionCallback;
  private onColorPickerClosed: ActionCallback;
  private onScreenshot: ActionCallback;
  private customColor = '#ff6600';
  private pointerActive = false;
  private minimized = false;

  // Drag state
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(
    container: HTMLElement,
    onChange: ToolbarChangeCallback,
    onClear: ActionCallback,
    onDone: ActionCallback,
    onUndo: ActionCallback,
    onRedo: ActionCallback,
    onPointer: ActionCallback,
    onSwitchToDraw: ActionCallback,
    onColorPickerOpened: ActionCallback,
    onColorPickerClosed: ActionCallback,
    onScreenshot: ActionCallback,
  ) {
    this.onChange = onChange;
    this.onClear = onClear;
    this.onDone = onDone;
    this.onUndo = onUndo;
    this.onRedo = onRedo;
    this.onPointer = onPointer;
    this.onSwitchToDraw = onSwitchToDraw;
    this.onColorPickerOpened = onColorPickerOpened;
    this.onColorPickerClosed = onColorPickerClosed;
    this.onScreenshot = onScreenshot;
    this.el = document.createElement('div');
    this.el.className = 'toolbar';
    container.appendChild(this.el);
    this.setupDrag();
    this.render();
  }

  show() {
    this.el.classList.add('visible');
  }

  hide() {
    this.el.classList.remove('visible');
  }

  getState(): ToolbarState {
    return this.state;
  }

  getElement(): HTMLDivElement {
    return this.el;
  }

  setTool(tool: ToolType) {
    this.state.activeTool = tool;
    this.render();
    this.onChange(this.state);
  }

  setPointerActive(active: boolean) {
    this.pointerActive = active;
    this.render();
  }

  toggleMinimized() {
    this.minimized = !this.minimized;
    this.render();
  }

  setMinimized(minimized: boolean) {
    this.minimized = minimized;
    this.render();
  }

  private setupDrag() {
    const onMouseMove = (e: MouseEvent) => {
      if (!this.dragging) return;
      e.preventDefault();
      e.stopPropagation();
      this.el.style.left = (e.clientX - this.dragOffsetX) + 'px';
      this.el.style.top = (e.clientY - this.dragOffsetY) + 'px';
      this.el.style.transform = 'none';
    };

    const onMouseUp = () => {
      this.dragging = false;
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
    };

    this.el.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      // Only drag from the toolbar background / drag handle, not from buttons
      if (target.closest('.tool-btn, .action-btn, .width-btn, .color-dot, .color-input-wrapper, .traffic-light')) {
        return;
      }
      this.dragging = true;
      const rect = this.el.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    });
  }

  isEventOnToolbar(e: MouseEvent): boolean {
    return this.el.contains(e.target as Node);
  }

  private renderTrafficLights() {
    const group = document.createElement('div');
    group.className = 'traffic-lights';

    const close = document.createElement('div');
    close.className = 'traffic-light traffic-red';
    close.title = 'Close';
    close.addEventListener('click', this.onDone);

    group.appendChild(close);

    if (this.minimized) {
      // When minimized: green button to expand
      const expand = document.createElement('div');
      expand.className = 'traffic-light traffic-green';
      expand.title = 'Expand';
      expand.addEventListener('click', () => {
        this.minimized = false;
        this.render();
      });
      group.appendChild(expand);
    } else {
      // When expanded: yellow button to minimize
      const minimize = document.createElement('div');
      minimize.className = 'traffic-light traffic-yellow';
      minimize.title = 'Minimize';
      minimize.addEventListener('click', () => {
        this.minimized = true;
        this.render();
      });
      group.appendChild(minimize);
    }

    this.el.appendChild(group);
  }

  private render() {
    this.el.innerHTML = '';

    // Drag handle (always visible)
    const handle = document.createElement('div');
    handle.className = 'toolbar-drag-handle';
    handle.textContent = '\u2261';
    this.el.appendChild(handle);

    // Traffic lights
    this.renderTrafficLights();

    if (this.minimized) {
      return;
    }

    this.addSeparator();

    if (this.pointerActive) {
      // Minimal toolbar: just pointer + draw
      const pointerGroup = this.createGroup();
      const pointerBtn = document.createElement('button');
      pointerBtn.className = 'tool-btn active';
      pointerBtn.textContent = '\u{1F53A}';
      pointerBtn.title = 'Laser Pointer (active)';
      pointerBtn.addEventListener('click', this.onPointer);
      pointerGroup.appendChild(pointerBtn);

      this.addSeparator();

      const actionGroup = this.createGroup();
      const drawBtn = document.createElement('button');
      drawBtn.className = 'action-btn';
      drawBtn.textContent = 'Draw';
      drawBtn.addEventListener('click', this.onSwitchToDraw);
      actionGroup.appendChild(drawBtn);
      return;
    }

    // Tool buttons
    const toolGroup = this.createGroup();
    for (const tool of ['freehand', 'rectangle', 'circle', 'arrow', 'eraser'] as ToolType[]) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn' + (this.state.activeTool === tool ? ' active' : '');
      btn.textContent = TOOL_ICONS[tool];
      btn.title = tool.charAt(0).toUpperCase() + tool.slice(1);
      btn.addEventListener('click', () => {
        this.state.activeTool = tool;
        this.render();
        this.onChange(this.state);
      });
      toolGroup.appendChild(btn);
    }

    this.addSeparator();

    // Color dots
    const colorGroup = this.createGroup();
    for (const color of COLORS) {
      const dot = document.createElement('div');
      dot.className = 'color-dot' + (this.state.style.color === color ? ' active' : '');
      dot.style.background = color;
      if (color === '#000000') dot.style.border = '2px solid rgba(255,255,255,0.3)';
      dot.addEventListener('click', () => {
        this.state.style.color = color;
        this.render();
        this.onChange(this.state);
      });
      colorGroup.appendChild(dot);
    }

    // Custom color picker
    const wrapper = document.createElement('div');
    wrapper.className = 'color-input-wrapper';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this.customColor;
    colorInput.addEventListener('click', () => {
      this.onColorPickerOpened();
    });
    colorInput.addEventListener('change', (e) => {
      this.customColor = (e.target as HTMLInputElement).value;
      this.state.style.color = this.customColor;
      this.onColorPickerClosed();
      this.render();
      this.onChange(this.state);
    });
    colorInput.addEventListener('input', (e) => {
      this.customColor = (e.target as HTMLInputElement).value;
      this.state.style.color = this.customColor;
      this.onChange(this.state);
    });
    const colorDot = document.createElement('div');
    colorDot.className = 'color-input-dot';
    if (!COLORS.includes(this.state.style.color)) {
      colorDot.style.background = this.state.style.color;
      colorDot.style.border = '2px solid #fff';
    }
    wrapper.appendChild(colorInput);
    wrapper.appendChild(colorDot);
    colorGroup.appendChild(wrapper);

    this.addSeparator();

    // Width buttons
    const widthGroup = this.createGroup();
    for (const w of WIDTHS) {
      const btn = document.createElement('button');
      btn.className = 'width-btn' + (this.state.style.width === w ? ' active' : '');
      const line = document.createElement('div');
      line.className = 'width-line';
      line.style.height = Math.max(w, 1) + 'px';
      btn.appendChild(line);
      btn.addEventListener('click', () => {
        this.state.style.width = w;
        this.render();
        this.onChange(this.state);
      });
      widthGroup.appendChild(btn);
    }

    this.addSeparator();

    // Undo/Redo buttons
    const undoRedoGroup = this.createGroup();
    const undoBtn = document.createElement('button');
    undoBtn.className = 'tool-btn';
    undoBtn.textContent = '\u21A9';
    undoBtn.title = 'Undo (Cmd+Z)';
    undoBtn.addEventListener('click', this.onUndo);
    undoRedoGroup.appendChild(undoBtn);

    const redoBtn = document.createElement('button');
    redoBtn.className = 'tool-btn';
    redoBtn.textContent = '\u21AA';
    redoBtn.title = 'Redo (Cmd+Y)';
    redoBtn.addEventListener('click', this.onRedo);
    undoRedoGroup.appendChild(redoBtn);

    this.addSeparator();

    // Pointer button
    const pointerGroup = this.createGroup();
    const pointerBtn = document.createElement('button');
    pointerBtn.className = 'tool-btn';
    pointerBtn.textContent = '\u{1F53A}';
    pointerBtn.title = 'Laser Pointer';
    pointerBtn.addEventListener('click', this.onPointer);
    pointerGroup.appendChild(pointerBtn);

    this.addSeparator();

    // Action buttons
    const actionGroup = this.createGroup();

    const screenshotBtn = document.createElement('button');
    screenshotBtn.className = 'action-btn';
    screenshotBtn.textContent = '\u{1F4CB}';
    screenshotBtn.title = 'Screenshot to clipboard';
    screenshotBtn.addEventListener('click', this.onScreenshot);
    actionGroup.appendChild(screenshotBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'action-btn danger';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', this.onClear);
    actionGroup.appendChild(clearBtn);
  }

  private createGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'toolbar-group';
    this.el.appendChild(group);
    return group;
  }

  private addSeparator() {
    const sep = document.createElement('div');
    sep.className = 'toolbar-separator';
    this.el.appendChild(sep);
  }
}
