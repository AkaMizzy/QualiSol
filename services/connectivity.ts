import * as Network from 'expo-network';

export type ConnectivityStatus = 'online' | 'offline';

export type ConnectivityResponse = {
  status: ConnectivityStatus;
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

export async function getConnectivity(): Promise<ConnectivityResponse> {
  const state = await Network.getNetworkStateAsync();
  const isConnected = !!state.isConnected;
  const isInternetReachable = state.isInternetReachable ?? null;
  const online = isConnected && (isInternetReachable !== false);
  return {
    status: online ? 'online' : 'offline',
    isConnected,
    isInternetReachable,
  };
}

export function startConnectivityMonitoring(
  onUpdate: (response: ConnectivityResponse) => void,
  intervalMs = 60000
): () => void {
  let active = true;

  async function tick() {
    if (!active) return;
    const result = await getConnectivity();
    if (!active) return;
    onUpdate(result);
  }

  // Initial check
  void tick();

  // Use polling as a portable baseline across platforms
  const id = setInterval(tick, intervalMs);
  return () => {
    active = false;
    clearInterval(id);
  };
}

/**
 * Add a listener for connectivity status changes
 * Only triggers callback when status actually changes (online/offline)
 * @param callback - Function to call when connectivity status changes
 * @returns Cleanup function to remove listener
 */
export function addConnectivityListener(
  callback: (status: ConnectivityStatus) => void
): () => void {
  let lastStatus: ConnectivityStatus | null = null;

  const cleanup = startConnectivityMonitoring((response) => {
    if (lastStatus !== response.status) {
      lastStatus = response.status;
      callback(response.status);
    }
  }, 10000); // Check every 10 seconds for status changes

  return cleanup;
}

