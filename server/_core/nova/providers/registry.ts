// NOVA Provider Registry
// SOPRANOVA Intelligence Platform

import { NovaProvider, NovaProviderRegistry } from './base';

export class NovaProviderRegistryImpl implements NovaProviderRegistry {
  private providers: Map<string, NovaProvider> = new Map();

  register(provider: NovaProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): NovaProvider | undefined {
    return this.providers.get(name);
  }

  list(): NovaProvider[] {
    return Array.from(this.providers.values());
  }

  async getAvailable(): Promise<NovaProvider[]> {
    const available: NovaProvider[] = [];
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }

  async getModelProvider(model: string): Promise<NovaProvider | undefined> {
    for (const provider of this.providers.values()) {
      if (provider.models.includes(model)) {
        if (await provider.isAvailable()) {
          return provider;
        }
      }
    }
    return undefined;
  }
}
