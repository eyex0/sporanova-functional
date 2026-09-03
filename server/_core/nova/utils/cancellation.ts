// NOVA Cancellation Support
// SOPRANOVA Intelligence Platform

export class NovaCancellationToken {
  private _cancelled: boolean = false;
  private _onCancel: (() => void)[] = [];

  cancel(): void {
    if (this._cancelled) return;
    this._cancelled = true;
    for (const fn of this._onCancel) {
      try {
        fn();
      } catch {
        // Ignore handler errors
      }
    }
  }

  onCancel(fn: () => void): void {
    if (this._cancelled) {
      try { fn(); } catch { /* ignore */ }
    } else {
      this._onCancel.push(fn);
    }
  }

  get cancelled(): boolean {
    return this._cancelled;
  }

  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new Error('Operation was cancelled');
    }
  }
}
