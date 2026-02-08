/**
 * Circuit breaker pattern for provider health tracking.
 *
 * Tracks consecutive failures per provider and opens the circuit
 * (skips the provider) after 3 consecutive failures. Re-tries after
 * a 5-minute cooldown period (half-open state).
 *
 * This is an in-memory tracker -- resets on server restart.
 * Acceptable for MVP since provider outages are typically transient
 * and a restart clears stale circuit state.
 */

interface ProviderHealth {
  consecutiveFailures: number
  lastFailure: Date | null
  circuitOpen: boolean
}

/** Cooldown period in milliseconds before re-trying an open circuit. */
const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

/** Number of consecutive failures before opening the circuit. */
const FAILURE_THRESHOLD = 3

export class ProviderHealthTracker {
  private healthMap: Map<string, ProviderHealth>

  constructor() {
    this.healthMap = new Map()
  }

  /**
   * Get or initialize health state for a provider.
   */
  private getOrCreate(providerId: string): ProviderHealth {
    let health = this.healthMap.get(providerId)
    if (!health) {
      health = {
        consecutiveFailures: 0,
        lastFailure: null,
        circuitOpen: false,
      }
      this.healthMap.set(providerId, health)
    }
    return health
  }

  /**
   * Record a successful call to a provider.
   * Resets consecutive failures and closes the circuit.
   */
  recordSuccess(providerId: string): void {
    const health = this.getOrCreate(providerId)
    health.consecutiveFailures = 0
    health.circuitOpen = false
  }

  /**
   * Record a failed call to a provider.
   * Increments consecutive failures and opens the circuit if threshold reached.
   */
  recordFailure(providerId: string): void {
    const health = this.getOrCreate(providerId)
    health.consecutiveFailures++
    health.lastFailure = new Date()

    if (health.consecutiveFailures >= FAILURE_THRESHOLD) {
      health.circuitOpen = true
      console.warn(
        `[provider-health] Circuit opened for ${providerId} after ${health.consecutiveFailures} consecutive failures`
      )
    }
  }

  /**
   * Check whether a provider should be used.
   * Returns true if the circuit is closed, or if the cooldown period has elapsed
   * (half-open state: allow one retry attempt).
   */
  shouldUseProvider(providerId: string): boolean {
    const health = this.getOrCreate(providerId)

    if (!health.circuitOpen) {
      return true
    }

    // Check cooldown (half-open state)
    if (
      health.lastFailure &&
      Date.now() - health.lastFailure.getTime() > COOLDOWN_MS
    ) {
      return true
    }

    return false
  }

  /**
   * Get the current health state for a provider.
   * Returns a copy to prevent external mutation.
   */
  getHealth(providerId: string): ProviderHealth {
    const health = this.getOrCreate(providerId)
    return { ...health }
  }
}

/**
 * Singleton instance of ProviderHealthTracker.
 * Shared across all provider client modules for consistent circuit state.
 */
export const providerHealth = new ProviderHealthTracker()
