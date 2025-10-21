import { detectDomain, getFeatureConfig } from '../config/feature-flags';
import logger from '../logger';

const OVERRIDE_PREFIX = 'CJ_AI_FLAGS_';

function createSwitch(checked: boolean): { el: HTMLElement; input: HTMLInputElement } {
  const label = document.createElement('label');
  label.className = 'cjai-switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  const slider = document.createElement('span');
  slider.className = 'cjai-switch__slider';
  label.append(input, slider);
  return { el: label, input };
}

export class FeatureFlagsWidget {
  readonly el: HTMLElement;
  private toggles = new Map<string, HTMLInputElement>();
  private base = detectDomain();
  private eff = getFeatureConfig();
  private status: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.className = 'cjai-section';

    const title = document.createElement('div');
    title.className = 'cjai-section__title';
    title.textContent = 'Feature Flags | 特性开关';

    const description = document.createElement('div');
    description.className = 'cjai-section__description';
    description.textContent = '启用或禁用实验性功能，一般情况下并不需要修改此设置，功能会随着作用域自动更新。';

    const meta = document.createElement('div');
    meta.style.fontSize = '12px';
    meta.style.color = 'var(--cjai-ink-muted)';
    meta.textContent = `Domain: ${this.base.domain}  •  Host: ${location.hostname}`;

    const rows = document.createElement('div');
    rows.className = 'cjai-rows';

    for (const [k, v] of Object.entries(this.eff.flags)) {
      const row = document.createElement('div');
      row.className = 'cjai-row';
      const label = document.createElement('div'); label.className = 'cjai-row__label'; label.textContent = k;
      const sw = createSwitch(!!v);
      row.append(label, sw.el);
      rows.appendChild(row);
      this.toggles.set(k, sw.input);
    }

    const actions = document.createElement('div');
    actions.style.display = 'flex'; actions.style.gap = '8px'; actions.style.marginTop = '8px';
    const btnApply = document.createElement('button'); btnApply.className = 'cjai-btn cjai-btn--primary'; btnApply.textContent = 'Apply';
    const btnReset = document.createElement('button'); btnReset.className = 'cjai-btn'; btnReset.textContent = 'Reset';
    const btnReload = document.createElement('button'); btnReload.className = 'cjai-btn'; btnReload.textContent = 'Reload';
    const status = document.createElement('div'); status.style.marginLeft = 'auto'; status.style.fontSize = '12px'; status.style.color = 'var(--cjai-ink-muted)';
    actions.append(btnApply, btnReset, btnReload, status);

    root.append(title, description, meta, rows, actions);
    this.el = root; this.status = status;

    btnApply.onclick = () => this.apply();
    btnReset.onclick = () => this.reset();
    btnReload.onclick = () => location.reload();
  }

  private setStatus(msg: string, ok = true) {
    this.status.textContent = msg; this.status.style.color = ok ? 'var(--cjai-ink-muted)' : '#e11d48';
  }

  private apply() {
    try {
      const baseFlags = this.base.flags;
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [k, input] of this.toggles.entries()) {
        const val = !!input.checked;
        next[k] = val;
        if (baseFlags[k as keyof typeof baseFlags] !== val) changed = true;
      }
      const key = `${OVERRIDE_PREFIX}${this.base.domain}`;
      if (!changed) {
        localStorage.removeItem(key);
        this.setStatus('No changes (overrides cleared)');
      } else {
        localStorage.setItem(key, JSON.stringify({ flags: next }));
        this.setStatus('Overrides saved. Reload to take effect.');
      }
    } catch (e) {
      logger.error('Apply flags failed', e);
      this.setStatus('Apply failed', false);
    }
  }

  private reset() {
    try {
      const key = `${OVERRIDE_PREFIX}${this.base.domain}`;
      localStorage.removeItem(key);
      // restore UI to base
      for (const [k, input] of this.toggles.entries()) {
        input.checked = !!this.base.flags[k as keyof typeof this.base.flags];
      }
      this.setStatus('Overrides cleared');
    } catch (e) {
      logger.error('Reset flags failed', e);
      this.setStatus('Reset failed', false);
    }
  }
}

export default FeatureFlagsWidget;

