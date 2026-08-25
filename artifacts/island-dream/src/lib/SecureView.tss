export class SecureView {
  private key: string;
  private container: HTMLElement | null;
  private shadowRoot: ShadowRoot | null = null;
  private worker: Worker | null = null;
  private showIndicator: boolean;

  constructor(options: {
    encryptionKey?: string;
    showIndicator?: boolean;
  } = {}) {
    this.key = options.encryptionKey || this.generateKey();
    this.showIndicator = options.showIndicator !== false;
    this.container = null;
  }

  init(containerId: string) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id ${containerId} not found`);
      return;
    }

    if (this.showIndicator) {
      this.createShieldIndicator();
    }

    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    this.addStyles();
    this.initWorker();
    this.preventInspection();
  }

  private createShieldIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'secure-shield-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      color: white;
      font-size: 12px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      user-select: none;
    `;
    indicator.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
      <span>Secure View Active</span>
    `;
    document.body.appendChild(indicator);

    indicator.addEventListener('mouseover', () => {
      indicator.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    });
    indicator.addEventListener('mouseout', () => {
      indicator.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });
  }

  private addStyles() {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = `
      :host {
        --secure-bg: #ffffff;
        --secure-border: #e0e0e0;
        --secure-text: #333333;
      }

      .secure-container {
        background: var(--secure-bg);
        border: 1px solid var(--secure-border);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .secure-content {
        color: var(--secure-text);
        font-family: inherit;
        line-height: 1.6;
      }

      .secure-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid var(--secure-border);
      }

      .secure-icon {
        width: 20px;
        height: 20px;
        fill: #667eea;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  private initWorker() {
    const workerCode = `
      let secureData = new Map();

      self.onmessage = function(event) {
        const { type, id, data, key } = event.data;

        if (type === 'STORE') {
          secureData.set(id, { data, key, timestamp: Date.now() });
          self.postMessage({ type: 'STORED', id, success: true });
        }

        if (type === 'RETRIEVE') {
          const stored = secureData.get(id);
          if (stored) {
            self.postMessage({ type: 'DATA', id, payload: stored.data });
          }
        }

        if (type === 'CLEAR') {
          secureData.delete(id);
          self.postMessage({ type: 'CLEARED', id });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);
  }

  storeSecurely(id: string, data: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(false);
        return;
      }

      this.worker.postMessage({
        type: 'STORE',
        id,
        data,
        key: this.key
      });

      const handler = (event: MessageEvent) => {
        if (event.data.id === id && event.data.type === 'STORED') {
          this.worker?.removeEventListener('message', handler);
          resolve(true);
        }
      };

      this.worker.addEventListener('message', handler);
    });
  }

  retrieveSecurely(id: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(null);
        return;
      }

      this.worker.postMessage({ type: 'RETRIEVE', id });

      const handler = (event: MessageEvent) => {
        if (event.data.id === id && event.data.type === 'DATA') {
          this.worker?.removeEventListener('message', handler);
          resolve(event.data.payload);
        }
      };

      this.worker.addEventListener('message', handler);
    });
  }

  render(content: string | HTMLElement | any, title: string = 'Secure Information') {
    if (!this.shadowRoot) return;

    this.shadowRoot.querySelectorAll('.secure-container').forEach(el => el.remove());

    const container = document.createElement('div');
    container.className = 'secure-container';

    const header = document.createElement('div');
    header.className = 'secure-header';
    header.innerHTML = `
      <svg class="secure-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>
      <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${title}</h3>
    `;
    container.appendChild(header);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'secure-content';

    if (typeof content === 'string') {
      contentDiv.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentDiv.appendChild(content.cloneNode(true));
    } else {
      contentDiv.textContent = JSON.stringify(content, null, 2);
    }

    container.appendChild(contentDiv);
    this.shadowRoot.appendChild(container);
  }

  private preventInspection() {
    if (!this.container) return;

    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private generateKey(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  clear() {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('.secure-container').forEach(el => el.remove());
  }
}

export default SecureView;
