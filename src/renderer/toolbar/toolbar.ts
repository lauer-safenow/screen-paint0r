import { ToolType, DrawingStyle } from '../../shared/types';

export interface ToolbarState {
  activeTool: ToolType;
  style: DrawingStyle;
}

type ToolbarChangeCallback = (state: ToolbarState) => void;
type ActionCallback = () => void;

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ffffff', '#000000'];
const WIDTHS = [2, 4, 8];

const TOOL_ICONS: Record<ToolType, string> = {
  freehand: '✏',
  rectangle: '▭',
  circle: '◯',
  arrow: '➜',
  eraser: '⌫',
};

export class Toolbar {
  private el: HTMLDivElement;
  private state: ToolbarState = {
    activeTool: 'freehand',
    style: { color: '#ef4444', width: 4 },
  };
  private onChange: ToolbarChangeCallback;
  private onClear: ActionCallback;
  private onDone: ActionCallback;
  private customColor = '#ff6600';

  constructor(container: HTMLElement, onChange: ToolbarChangeCallback, onClear: ActionCallback, onDone: ActionCallback) {
    this.onChange = onChange;
    this.onClear = onClear;
    this.onDone = onDone;
    this.el = document.createElement('div');
    this.el.className = 'toolbar';
    container.appendChild(this.el);
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

  setTool(tool: ToolType) {
    this.state.activeTool = tool;
    this.render();
    this.onChange(this.state);
  }

  private render() {
    this.el.innerHTML = '';

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
    colorInput.addEventListener('input', (e) => {
      this.customColor = (e.target as HTMLInputElement).value;
      this.state.style.color = this.customColor;
      this.render();
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

    // Action buttons
    const actionGroup = this.createGroup();
    const clearBtn = document.createElement('button');
    clearBtn.className = 'action-btn danger';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', this.onClear);
    actionGroup.appendChild(clearBtn);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'action-btn';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', this.onDone);
    actionGroup.appendChild(doneBtn);
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
